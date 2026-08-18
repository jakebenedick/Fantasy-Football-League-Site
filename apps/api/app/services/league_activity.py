from collections import Counter, defaultdict
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
        all_time_points: defaultdict[str, float] = defaultdict(float)
        weekly_highs: dict[str, tuple[float, str, int]] = {}
        weekly_lows: dict[str, tuple[float, str, int]] = {}
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
            for roster in season.rosters:
                roster_owner_id = season.owners_by_roster.get(roster.roster_id)
                if not roster_owner_id:
                    continue
                all_time_points[roster_owner_id] += (
                    float(roster.settings.get("fpts") or 0)
                    + float(roster.settings.get("fpts_decimal") or 0) / 100
                )
            for week, matchup in season.weekly_matchups:
                matchup_owner_id = season.owners_by_roster.get(matchup.roster_id)
                # Sleeper returns zero-point placeholders for weeks that have
                # not been played, so only positive recorded scores qualify.
                if not matchup_owner_id or matchup.points <= 0:
                    continue
                record = (float(matchup.points), str(season.league.season), week)
                if (
                    matchup_owner_id not in weekly_highs
                    or record[0] > weekly_highs[matchup_owner_id][0]
                ):
                    weekly_highs[matchup_owner_id] = record
                if (
                    matchup_owner_id not in weekly_lows
                    or record[0] < weekly_lows[matchup_owner_id][0]
                ):
                    weekly_lows[matchup_owner_id] = record
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
                    trade_owner_id = season.owners_by_roster.get(roster_id)
                    if not trade_owner_id:
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
                            manager_name=names.get(trade_owner_id, trade_owner_id),
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
                all_time_points=round(all_time_points[owner_id], 2),
                highest_weekly_score=(
                    round(weekly_highs[owner_id][0], 2)
                    if owner_id in weekly_highs
                    else None
                ),
                highest_weekly_season=(
                    weekly_highs[owner_id][1] if owner_id in weekly_highs else None
                ),
                highest_weekly_week=(
                    weekly_highs[owner_id][2] if owner_id in weekly_highs else None
                ),
                lowest_weekly_score=(
                    round(weekly_lows[owner_id][0], 2)
                    if owner_id in weekly_lows
                    else None
                ),
                lowest_weekly_season=(
                    weekly_lows[owner_id][1] if owner_id in weekly_lows else None
                ),
                lowest_weekly_week=(
                    weekly_lows[owner_id][2] if owner_id in weekly_lows else None
                ),
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
