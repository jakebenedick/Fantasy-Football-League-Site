from app.domain.models import (
    LeagueHistory,
    LeagueHistoryBracketMatch,
    LeagueHistorySeason,
    LeagueHistoryTeam,
)
from app.integrations.sleeper.client import SleeperClient
from app.services.history_repository import LeagueHistoryRepository


class LeagueHistoryService:
    def __init__(self, client: SleeperClient) -> None:
        self._history = LeagueHistoryRepository(client)

    async def get_history(self, league_id: str) -> LeagueHistory:
        seasons: list[LeagueHistorySeason] = []
        snapshot = await self._history.load(league_id)
        for history_season in snapshot.seasons:
            league = history_season.league
            rosters = history_season.rosters
            members = history_season.members
            bracket = history_season.bracket
            members_by_id = {member.user_id: member for member in members}
            placements: dict[int, int] = {}
            for match in bracket:
                if match.p is not None:
                    if match.w is not None:
                        placements[match.w] = match.p
                    if match.loser is not None:
                        placements[match.loser] = match.p + 1
            champion = next(
                (roster_id for roster_id, place in placements.items() if place == 1), None
            )
            regular_order = sorted(
                rosters,
                key=lambda roster: (
                    -int(roster.settings.get("wins") or 0),
                    -(
                        float(roster.settings.get("fpts") or 0)
                        + float(roster.settings.get("fpts_decimal") or 0) / 100
                    ),
                ),
            )
            open_positions = iter(
                position
                for position in range(1, len(rosters) + 1)
                if position not in placements.values()
            )
            for roster in regular_order:
                if roster.roster_id not in placements:
                    placements[roster.roster_id] = next(open_positions)
            teams = []
            for roster in rosters:
                member = members_by_id.get(roster.owner_id or "")
                teams.append(
                    LeagueHistoryTeam(
                        roster_id=roster.roster_id,
                        owner_id=roster.owner_id,
                        manager_name=member.display_name if member else f"Team {roster.roster_id}",
                        team_name=member.metadata.get("team_name") if member else None,
                        wins=int(roster.settings.get("wins") or 0),
                        losses=int(roster.settings.get("losses") or 0),
                        ties=int(roster.settings.get("ties") or 0),
                        points=float(roster.settings.get("fpts") or 0)
                        + float(roster.settings.get("fpts_decimal") or 0) / 100,
                        champion=roster.roster_id == champion,
                        finish_position=placements.get(roster.roster_id),
                        avatar_url=f"https://sleepercdn.com/avatars/thumbs/{member.avatar}"
                        if member and member.avatar
                        else None,
                    )
                )
            teams.sort(key=lambda team: team.finish_position or 999)
            matches = [
                LeagueHistoryBracketMatch(
                    round=match.r,
                    match_id=match.m,
                    team_1_roster_id=match.t1,
                    team_2_roster_id=match.t2,
                    winner_roster_id=match.w,
                    loser_roster_id=match.loser,
                    placement=match.p,
                )
                for match in bracket
            ]
            seasons.append(
                LeagueHistorySeason(
                    league_id=league.league_id, season=league.season, teams=teams, bracket=matches
                )
            )
        seasons.sort(key=lambda item: item.season, reverse=True)
        return LeagueHistory(seasons=seasons)
