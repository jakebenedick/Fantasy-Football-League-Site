from datetime import datetime, timezone

from app.domain.models import PlayerHistory, PlayerMovement, PlayerMovementSide
from app.integrations.sleeper.client import SleeperClient
from app.services.draft_results import completed_pick_label
from app.services.history_repository import LeagueHistoryRepository


class PlayerHistoryService:
    def __init__(self, client: SleeperClient) -> None:
        self._client = client
        self._history = LeagueHistoryRepository(client)

    async def get_history(self, league_id: str, player_id: str) -> PlayerHistory:
        events: list[PlayerMovement] = []
        snapshot = await self._history.load(league_id)
        related_player_ids = {
            related_id
            for season in snapshot.seasons
            for transaction in season.transactions
            for related_id in [
                *(transaction.adds or {}).keys(),
                *(transaction.drops or {}).keys(),
            ]
        }
        related_players = await self._client.get_players(related_player_ids | {player_id})

        def player_name(related_id: str) -> str:
            player = related_players.get(related_id)
            if not player:
                return f"Player {related_id}"
            return (
                player.full_name
                or " ".join(filter(None, [player.first_name, player.last_name]))
                or f"Player {related_id}"
            )

        for season in snapshot.seasons:
            drafts_by_id = {draft.draft_id: draft for draft in season.drafts}
            for pick in season.draft_picks:
                if pick.player_id != player_id:
                    continue
                draft = drafts_by_id.get(pick.draft_id)
                occurred = (
                    datetime.fromtimestamp(draft.start_time / 1000, timezone.utc)
                    if draft and draft.start_time
                    else None
                )
                manager = season.roster_names.get(pick.roster_id, f"Team {pick.roster_id}")
                events.append(
                    PlayerMovement(
                        event_type="draft",
                        league_season=season.league.season,
                        occurred_at=occurred,
                        to_manager_name=manager,
                        description=f"Drafted by {manager} at pick {pick.pick_no} (round {pick.round})",
                        details=[
                            f"Round {pick.round}, overall pick {pick.pick_no}",
                            f"Draft ID: {pick.draft_id}",
                        ],
                    )
                )
            for transaction in season.transactions:
                added_to = (transaction.adds or {}).get(player_id)
                dropped_by = (transaction.drops or {}).get(player_id)
                if added_to is None and dropped_by is None:
                    continue
                source = (
                    season.roster_names.get(dropped_by, "Free agents")
                    if dropped_by
                    else "Free agents"
                )
                destination = (
                    season.roster_names.get(added_to, "Free agents") if added_to else "Free agents"
                )
                details = [
                    *(
                        f"{season.roster_names.get(roster_id, f'Team {roster_id}')} received {player_name(related_id)}"
                        for related_id, roster_id in (transaction.adds or {}).items()
                    ),
                    *(
                        f"{season.roster_names.get(roster_id, f'Team {roster_id}')} {('sent' if transaction.type == 'trade' else 'dropped')} {player_name(related_id)}"
                        for related_id, roster_id in (transaction.drops or {}).items()
                    ),
                    *(
                        f"{completed_pick_label(pick.season, pick.round, pick.roster_id, snapshot.pick_numbers)}: {season.roster_names.get(pick.previous_owner_id, f'Team {pick.previous_owner_id}')} → {season.roster_names.get(pick.owner_id, f'Team {pick.owner_id}')}"
                        for pick in transaction.draft_picks
                    ),
                ]
                sides = []
                if transaction.type == "trade":
                    for roster_id in transaction.roster_ids:
                        assets = [
                            player_name(related_id)
                            for related_id, recipient in (transaction.adds or {}).items()
                            if recipient == roster_id
                        ]
                        assets.extend(
                            completed_pick_label(
                                pick.season,
                                pick.round,
                                pick.roster_id,
                                snapshot.pick_numbers,
                            )
                            for pick in transaction.draft_picks
                            if pick.owner_id == roster_id
                        )
                        sides.append(
                            PlayerMovementSide(
                                roster_id=roster_id,
                                manager_name=season.roster_names.get(
                                    roster_id, f"Team {roster_id}"
                                ),
                                assets_received=assets,
                            )
                        )
                events.append(
                    PlayerMovement(
                        event_type=transaction.type,
                        league_season=season.league.season,
                        occurred_at=datetime.fromtimestamp(
                            transaction.created / 1000, timezone.utc
                        ),
                        from_manager_name=season.roster_names.get(dropped_by)
                        if dropped_by
                        else None,
                        to_manager_name=season.roster_names.get(added_to) if added_to else None,
                        description=f"{transaction.type.replace('_', ' ').title()}: {source} → {destination}",
                        transaction_id=transaction.transaction_id,
                        details=details,
                        sides=sides,
                    )
                )
        events.sort(
            key=lambda event: event.occurred_at or datetime.min.replace(tzinfo=timezone.utc)
        )
        return PlayerHistory(player_id=player_id, player_name=player_name(player_id), events=events)
