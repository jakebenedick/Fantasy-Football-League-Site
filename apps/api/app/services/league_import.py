import asyncio
from datetime import datetime, timezone
from app.domain.models import (
    FantasyRoster,
    DraftPick,
    LeagueContext,
    LeagueSummary,
    Player,
    SourceMetadata,
    User,
)
from app.integrations.sleeper.client import SleeperClient
from app.integrations.sleeper.models import SleeperPlayer
from app.services.history_repository import LeagueHistoryRepository


def normalize_player(player_id: str, player: SleeperPlayer) -> Player:
    def optional_int(value: int | str | None) -> int | None:
        try:
            return int(value) if value not in (None, "") else None
        except (TypeError, ValueError):
            return None

    return Player(
        player_id=player_id,
        full_name=player.full_name
        or " ".join(filter(None, [player.first_name, player.last_name]))
        or player_id,
        first_name=player.first_name,
        last_name=player.last_name,
        nfl_team=player.team,
        position=player.position,
        eligible_positions=(player.fantasy_positions or [])
        or ([player.position] if player.position else []),
        status=player.status,
        injury_status=player.injury_status,
        number=optional_int(player.number),
        age=optional_int(player.age),
        avatar_url=(
            f"https://sleepercdn.com/content/nfl/players/{player_id}.jpg"
            if player_id.isdigit()
            else None
        ),
    )


class LeagueImportService:
    def __init__(self, client: SleeperClient) -> None:
        self._client = client

    async def import_for_user(self, username: str, league_id: str) -> LeagueContext:
        user = await self._client.get_user(username)
        league, raw_rosters, members, traded_picks, drafts = await asyncio.gather(
            self._client.get_league(league_id),
            self._client.get_rosters(league_id),
            self._client.get_members(league_id),
            self._client.get_traded_picks(league_id),
            self._client.get_drafts(league_id),
        )
        names = {m.user_id: m.display_name for m in members}
        member_by_id = {m.user_id: m for m in members}
        draft_rounds = int(league.settings.get("draft_rounds") or 5)
        current_season_draft_complete = any(
            draft.season == league.season and draft.status == "complete" for draft in drafts
        )
        first_pick_season = int(league.season) + int(current_season_draft_complete)
        pick_owners = {
            (str(season), round_number, roster.roster_id): roster.roster_id
            for season in range(first_pick_season, first_pick_season + 4)
            for round_number in range(1, draft_rounds + 1)
            for roster in raw_rosters
        }
        for pick in traded_picks:
            if int(pick.season) >= first_pick_season:
                pick_owners[(pick.season, pick.round, pick.roster_id)] = pick.owner_id
        rosters = [
            FantasyRoster(
                roster_id=r.roster_id,
                owner_id=r.owner_id,
                owner_display_name=names.get(r.owner_id or ""),
                team_name=(
                    member_by_id.get(r.owner_id or "").metadata.get("team_name")
                    if member_by_id.get(r.owner_id or "")
                    else None
                ),
                owner_avatar_url=(
                    f"https://sleepercdn.com/avatars/thumbs/{member_by_id[r.owner_id].avatar}"
                    if r.owner_id in member_by_id and member_by_id[r.owner_id].avatar
                    else None
                ),
                players=r.players,
                starters=r.starters,
                taxi=r.taxi or [],
                reserve=r.reserve or [],
                settings=r.settings,
                draft_picks=[
                    DraftPick(
                        season=season,
                        round=round_number,
                        original_roster_id=original_id,
                        original_owner_name=next(
                            (
                                names.get(candidate.owner_id or "")
                                for candidate in raw_rosters
                                if candidate.roster_id == original_id
                            ),
                            None,
                        ),
                        acquired=original_id != r.roster_id,
                    )
                    for (season, round_number, original_id), owner_id in pick_owners.items()
                    if owner_id == r.roster_id
                ],
            )
            for r in raw_rosters
        ]
        player_ids = {player_id for roster in raw_rosters for player_id in roster.players}
        raw_players = await self._client.get_players(player_ids)
        players = {
            player_id: normalize_player(player_id, p) for player_id, p in raw_players.items()
        }
        history_repository = LeagueHistoryRepository(self._client)
        history_snapshot = await history_repository.load(league_id)
        originals = history_repository.original_players(history_snapshot)
        current_owner_by_player = {
            player_id: roster.owner_id for roster in raw_rosters for player_id in roster.players
        }
        for player_id, player in players.items():
            original = originals.get(player_id)
            if original and current_owner_by_player.get(player_id) == original.owner_id:
                player.is_og = True
                player.og_drafted_season = original.drafted_season
                player.og_pick_number = original.pick_number
        league_data = league.model_dump()
        league_data["taxi_slots"] = int(league.settings.get("taxi_slots") or 0)
        league_data["avatar_url"] = (
            f"https://sleepercdn.com/avatars/{league.avatar}" if league.avatar else None
        )
        return LeagueContext(
            league=LeagueSummary(**league_data),
            selected_user=User(**user.model_dump()),
            selected_roster=next((r for r in rosters if r.owner_id == user.user_id), None),
            rosters=rosters,
            players=players,
            source=SourceMetadata(retrieved_at=datetime.now(timezone.utc)),
        )
