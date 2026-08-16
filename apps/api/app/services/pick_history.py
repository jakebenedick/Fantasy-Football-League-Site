from datetime import datetime, timezone

from app.domain.models import DraftPick, PickHistory, PickTransfer, TradeSide
from app.integrations.sleeper.client import SleeperClient
from app.services.history_repository import LeagueHistoryRepository


class PickHistoryService:
    def __init__(self, client: SleeperClient) -> None:
        self._client = client
        self._history = LeagueHistoryRepository(client)

    async def get_history(
        self, league_id: str, season: str, round_number: int, original_roster_id: int
    ) -> PickHistory:
        transfers: list[PickTransfer] = []
        latest_names: dict[int, str] = {}
        current_owner_id = original_roster_id
        resolved_pick_number: int | None = None
        snapshot = await self._history.load(league_id)
        for history_season in snapshot.seasons:
            if not latest_names:
                latest_names = history_season.roster_names
            resolved_pick_number = resolved_pick_number or snapshot.pick_numbers.get(
                (season, round_number, original_roster_id)
            )
            for transaction in history_season.transactions:
                if transaction.type != "trade" or transaction.status != "complete":
                    continue
                matching = next(
                    (
                        pick
                        for pick in transaction.draft_picks
                        if pick.season == season
                        and pick.round == round_number
                        and pick.roster_id == original_roster_id
                    ),
                    None,
                )
                if not matching:
                    continue
                sides = [
                    TradeSide(
                        roster_id=roster_id,
                        manager_name=history_season.roster_names.get(
                            roster_id, f"Team {roster_id}"
                        ),
                        player_ids_received=sorted(
                            player_id
                            for player_id, recipient in (transaction.adds or {}).items()
                            if recipient == roster_id
                        ),
                        draft_picks_received=[
                            DraftPick(
                                season=pick.season,
                                round=pick.round,
                                original_roster_id=pick.roster_id,
                                original_owner_name=history_season.roster_names.get(pick.roster_id),
                                pick_number=snapshot.pick_numbers.get(
                                    (pick.season, pick.round, pick.roster_id)
                                ),
                                acquired=pick.roster_id != roster_id,
                            )
                            for pick in transaction.draft_picks
                            if pick.owner_id == roster_id
                        ],
                    )
                    for roster_id in transaction.roster_ids
                ]
                transfers.append(
                    PickTransfer(
                        transaction_id=transaction.transaction_id,
                        league_season=history_season.league.season,
                        created_at=datetime.fromtimestamp(transaction.created / 1000, timezone.utc),
                        from_roster_id=matching.previous_owner_id,
                        from_manager_name=history_season.roster_names.get(
                            matching.previous_owner_id, f"Team {matching.previous_owner_id}"
                        ),
                        to_roster_id=matching.owner_id,
                        to_manager_name=history_season.roster_names.get(
                            matching.owner_id, f"Team {matching.owner_id}"
                        ),
                        trade_sides=sides,
                    )
                )
        transfers.sort(key=lambda item: item.created_at)
        if transfers:
            current_owner_id = transfers[-1].to_roster_id
        historical_ids = {
            player_id
            for transfer in transfers
            for side in transfer.trade_sides
            for player_id in side.player_ids_received
        }
        historical_players = await self._client.get_players(historical_ids)
        original_name = latest_names.get(original_roster_id, f"Team {original_roster_id}")
        return PickHistory(
            pick=DraftPick(
                season=season,
                round=round_number,
                original_roster_id=original_roster_id,
                original_owner_name=original_name,
                pick_number=resolved_pick_number,
                acquired=current_owner_id != original_roster_id,
            ),
            current_owner_id=current_owner_id,
            current_owner_name=latest_names.get(current_owner_id, f"Team {current_owner_id}"),
            transfers=transfers,
            player_names={
                player_id: player.full_name
                or " ".join(filter(None, [player.first_name, player.last_name]))
                or player_id
                for player_id, player in historical_players.items()
            },
        )
