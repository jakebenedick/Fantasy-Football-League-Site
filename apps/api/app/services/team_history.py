from datetime import datetime, timezone

from app.domain.models import DraftPick, SeasonRecord, TeamHistory, TradeSide, TradeSummary
from app.integrations.sleeper.client import SleeperClient
from app.services.history_repository import LeagueHistoryRepository


class TeamHistoryService:
    def __init__(self, client: SleeperClient) -> None:
        self._client = client
        self._history = LeagueHistoryRepository(client)

    async def get_history(
        self, league_id: str, selected_user_id: str, other_user_id: str
    ) -> TeamHistory:
        seasons: list[SeasonRecord] = []
        trades: list[TradeSummary] = []
        current_target_roster = 0
        snapshot = await self._history.load(league_id)
        for season in snapshot.seasons:
            mine = next((r for r in season.rosters if r.owner_id == selected_user_id), None)
            other = next((r for r in season.rosters if r.owner_id == other_user_id), None)
            championship = next(
                (match.w for match in season.bracket if match.p == 1 and match.w), None
            )
            if championship is None and season.bracket:
                championship = max(season.bracket, key=lambda match: match.r).w
            if other:
                current_target_roster = current_target_roster or other.roster_id
                seasons.append(
                    SeasonRecord(
                        season=season.league.season,
                        wins=int(other.settings.get("wins") or 0),
                        losses=int(other.settings.get("losses") or 0),
                        ties=int(other.settings.get("ties") or 0),
                        points=float(other.settings.get("fpts") or 0)
                        + float(other.settings.get("fpts_decimal") or 0) / 100,
                        champion=other.roster_id == championship,
                    )
                )
            if not mine or not other:
                continue
            for transaction in season.transactions:
                if not (
                    transaction.type == "trade"
                    and transaction.status == "complete"
                    and mine.roster_id in transaction.roster_ids
                    and other.roster_id in transaction.roster_ids
                ):
                    continue
                sides = []
                for roster_id in transaction.roster_ids:
                    sides.append(
                        TradeSide(
                            roster_id=roster_id,
                            manager_name=season.roster_names.get(roster_id, f"Team {roster_id}"),
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
                                    original_owner_name=season.roster_names.get(pick.roster_id),
                                    pick_number=snapshot.pick_numbers.get(
                                        (pick.season, pick.round, pick.roster_id)
                                    ),
                                    acquired=pick.roster_id != roster_id,
                                )
                                for pick in transaction.draft_picks
                                if pick.owner_id == roster_id
                            ],
                        )
                    )
                trades.append(
                    TradeSummary(
                        transaction_id=transaction.transaction_id,
                        season=season.league.season,
                        created_at=datetime.fromtimestamp(transaction.created / 1000, timezone.utc),
                        sides=sides,
                    )
                )
        trades.sort(key=lambda item: item.created_at, reverse=True)
        seasons.sort(key=lambda item: item.season, reverse=True)
        historical_ids = {
            player_id
            for trade in trades
            for side in trade.sides
            for player_id in side.player_ids_received
        }
        historical_players = await self._client.get_players(historical_ids)
        return TeamHistory(
            roster_id=current_target_roster,
            owner_id=other_user_id,
            seasons=seasons,
            trades_with_selected_user=trades,
            player_names={
                player_id: player.full_name
                or " ".join(filter(None, [player.first_name, player.last_name]))
                or player_id
                for player_id, player in historical_players.items()
            },
        )
