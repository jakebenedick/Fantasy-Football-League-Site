from collections import Counter
from datetime import datetime, timezone
from itertools import combinations

from app.domain.models import (
    LeagueActivity,
    LeagueActivityTeam,
    LeagueActivityTrade,
    LeagueActivityTradeSide,
    LeagueTradePair,
)
from app.integrations.sleeper.client import SleeperClient
from app.services.draft_results import completed_pick_label
from app.services.history_repository import LeagueHistoryRepository


class LeagueActivityService:
    def __init__(self, client: SleeperClient) -> None:
        self._client = client
        self._history = LeagueHistoryRepository(client)

    async def get_activity(self, league_id: str) -> LeagueActivity:
        team_counts: Counter[str] = Counter()
        trade_counts: Counter[str] = Counter()
        pair_counts: Counter[tuple[str, str]] = Counter()
        pair_history: dict[tuple[str, str], list[LeagueActivityTrade]] = {}
        names: dict[str, str] = {}
        avatars: dict[str, str | None] = {}
        snapshot = await self._history.load(league_id)
        related_player_ids = {
            player_id
            for season in snapshot.seasons
            for transaction in season.transactions
            for player_id in (transaction.adds or {}).keys()
        }
        players = await self._client.get_players(related_player_ids)

        def player_name(player_id: str) -> str:
            player = players.get(player_id)
            if not player:
                return f"Player {player_id}"
            return (
                player.full_name
                or " ".join(filter(None, [player.first_name, player.last_name]))
                or f"Player {player_id}"
            )

        for season in snapshot.seasons:
            members_by_id = {member.user_id: member for member in season.members}
            for owner_id in season.owners_by_roster.values():
                member = members_by_id.get(owner_id)
                if owner_id not in names:
                    names[owner_id] = member.display_name if member else owner_id
                    avatars[owner_id] = (
                        f"https://sleepercdn.com/avatars/thumbs/{member.avatar}"
                        if member and member.avatar
                        else None
                    )
            for transaction in season.transactions:
                if transaction.status != "complete":
                    continue
                owners = sorted(
                    {
                        season.owners_by_roster[roster_id]
                        for roster_id in transaction.roster_ids
                        if roster_id in season.owners_by_roster
                    }
                )
                for owner_id in owners:
                    team_counts[owner_id] += 1
                    if transaction.type == "trade":
                        trade_counts[owner_id] += 1
                if transaction.type != "trade":
                    continue
                sides = []
                for roster_id in transaction.roster_ids:
                    owner_id = season.owners_by_roster.get(roster_id)
                    if not owner_id:
                        continue
                    assets = [
                        player_name(player_id)
                        for player_id, recipient in (transaction.adds or {}).items()
                        if recipient == roster_id
                    ]
                    assets.extend(
                        f"{completed_pick_label(pick.season, pick.round, pick.roster_id, snapshot.pick_numbers)} (from {season.roster_names.get(pick.roster_id, f'Team {pick.roster_id}')})"
                        for pick in transaction.draft_picks
                        if pick.owner_id == roster_id
                    )
                    sides.append(
                        LeagueActivityTradeSide(
                            manager_name=names.get(owner_id, owner_id),
                            assets_received=assets,
                        )
                    )
                trade_detail = LeagueActivityTrade(
                    transaction_id=transaction.transaction_id,
                    season=season.league.season,
                    created_at=datetime.fromtimestamp(transaction.created / 1000, timezone.utc),
                    sides=sides,
                )
                for owner_a, owner_b in combinations(owners, 2):
                    pair_counts[(owner_a, owner_b)] += 1
                    pair_history.setdefault((owner_a, owner_b), []).append(trade_detail)

        teams = [
            LeagueActivityTeam(
                owner_id=owner_id,
                manager_name=name,
                avatar_url=avatars.get(owner_id),
                transactions=team_counts[owner_id],
                trades=trade_counts[owner_id],
            )
            for owner_id, name in names.items()
        ]
        teams.sort(key=lambda team: (-team.transactions, -team.trades, team.manager_name.lower()))
        pairs = [
            LeagueTradePair(
                owner_ids=[owner_a, owner_b],
                manager_names=[names.get(owner_a, owner_a), names.get(owner_b, owner_b)],
                trades=count,
                trade_history=sorted(
                    pair_history.get((owner_a, owner_b), []),
                    key=lambda trade: trade.created_at,
                    reverse=True,
                ),
            )
            for (owner_a, owner_b), count in pair_counts.items()
        ]
        pairs.sort(key=lambda pair: (-pair.trades, pair.manager_names))
        return LeagueActivity(
            teams=teams,
            trade_pairs=pairs,
            seasons_scanned=[season.league.season for season in snapshot.seasons],
        )
