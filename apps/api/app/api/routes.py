from datetime import datetime
from typing import Annotated, AsyncIterator
import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from app.core.config import Settings, get_settings
from app.domain.models import (
    LeagueContext,
    LeagueActivity,
    LeagueHistory,
    LeagueScoringAudit,
    LeagueSummary,
    PickHistory,
    Player,
    PlayerHistory,
    TeamHistory,
    User,
)
from app.integrations.sleeper.client import (
    SleeperClient,
    SleeperNotFoundError,
    SleeperPayloadError,
    SleeperUnavailableError,
)
from app.services.league_import import LeagueImportService, normalize_player
from app.services.team_history import TeamHistoryService
from app.services.pick_history import PickHistoryService
from app.services.league_history import LeagueHistoryService
from app.services.player_history import PlayerHistoryService
from app.services.league_activity import LeagueActivityService
from app.services.scoring_audit import LeagueScoringAuditService, NflverseUnavailableError

router = APIRouter(prefix="/api/v1/sleeper", tags=["sleeper"])


async def sleeper_client(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncIterator[SleeperClient]:
    async with httpx.AsyncClient(
        base_url=settings.sleeper_base_url,
        timeout=settings.sleeper_timeout_seconds,
        headers={"User-Agent": "fantasy-co-manager/0.1"},
    ) as http:
        yield SleeperClient(http)


Client = Annotated[SleeperClient, Depends(sleeper_client)]
Username = Annotated[str, Path(min_length=1, max_length=50)]


def error(exc: Exception) -> HTTPException:
    if isinstance(exc, SleeperNotFoundError):
        return HTTPException(404, str(exc))
    if isinstance(exc, SleeperPayloadError):
        return HTTPException(502, "Sleeper returned an unexpected response")
    return HTTPException(503, "Sleeper is temporarily unavailable")


@router.get("/users/{username}", response_model=User)
async def get_user(username: Username, client: Client) -> User:
    try:
        return User(**(await client.get_user(username)).model_dump())
    except (SleeperNotFoundError, SleeperPayloadError, SleeperUnavailableError) as exc:
        raise error(exc) from exc


@router.get("/users/{username}/leagues", response_model=list[LeagueSummary])
async def get_leagues(
    username: Username,
    client: Client,
    season: Annotated[int, Query(ge=2000, le=2100)] = datetime.now().year,
) -> list[LeagueSummary]:
    try:
        user = await client.get_user(username)
        return [
            LeagueSummary(**x.model_dump()) for x in await client.get_leagues(user.user_id, season)
        ]
    except (SleeperNotFoundError, SleeperPayloadError, SleeperUnavailableError) as exc:
        raise error(exc) from exc


@router.get("/users/{username}/leagues/{league_id}", response_model=LeagueContext)
async def get_context(
    username: Username, league_id: Annotated[str, Path(min_length=1, max_length=50)], client: Client
) -> LeagueContext:
    try:
        return await LeagueImportService(client).import_for_user(username, league_id)
    except (SleeperNotFoundError, SleeperPayloadError, SleeperUnavailableError) as exc:
        raise error(exc) from exc


@router.get("/players/{player_id}", response_model=Player)
async def get_player(
    player_id: Annotated[str, Path(min_length=1, max_length=30)], client: Client
) -> Player:
    try:
        players = await client.get_players({player_id})
        if player_id not in players:
            raise SleeperNotFoundError(f"Sleeper player '{player_id}' was not found")
        return normalize_player(player_id, players[player_id])
    except (SleeperNotFoundError, SleeperPayloadError, SleeperUnavailableError) as exc:
        raise error(exc) from exc


@router.get("/leagues/{league_id}/team-history/{owner_id}", response_model=TeamHistory)
async def get_team_history(
    league_id: str, owner_id: str, selected_user_id: str, client: Client
) -> TeamHistory:
    try:
        return await TeamHistoryService(client).get_history(league_id, selected_user_id, owner_id)
    except (SleeperNotFoundError, SleeperPayloadError, SleeperUnavailableError) as exc:
        raise error(exc) from exc


@router.get("/leagues/{league_id}/pick-history", response_model=PickHistory)
async def get_pick_history(
    league_id: str, season: str, round_number: int, original_roster_id: int, client: Client
) -> PickHistory:
    try:
        return await PickHistoryService(client).get_history(
            league_id, season, round_number, original_roster_id
        )
    except (SleeperNotFoundError, SleeperPayloadError, SleeperUnavailableError) as exc:
        raise error(exc) from exc


@router.get("/leagues/{league_id}/history", response_model=LeagueHistory)
async def get_league_history(league_id: str, client: Client) -> LeagueHistory:
    try:
        return await LeagueHistoryService(client).get_history(league_id)
    except (SleeperNotFoundError, SleeperPayloadError, SleeperUnavailableError) as exc:
        raise error(exc) from exc


@router.get("/leagues/{league_id}/activity", response_model=LeagueActivity)
async def get_league_activity(league_id: str, client: Client) -> LeagueActivity:
    try:
        return await LeagueActivityService(client).get_activity(league_id)
    except (SleeperNotFoundError, SleeperPayloadError, SleeperUnavailableError) as exc:
        raise error(exc) from exc


@router.get("/leagues/{league_id}/player-history/{player_id}", response_model=PlayerHistory)
async def get_player_history(league_id: str, player_id: str, client: Client) -> PlayerHistory:
    try:
        return await PlayerHistoryService(client).get_history(league_id, player_id)
    except (SleeperNotFoundError, SleeperPayloadError, SleeperUnavailableError) as exc:
        raise error(exc) from exc


@router.get("/leagues/{league_id}/scoring-audit", response_model=LeagueScoringAudit)
@router.get("/leagues/{league_id}/statistics", response_model=LeagueScoringAudit)
async def get_scoring_audit(
    league_id: str,
    client: Client,
    season: Annotated[int, Query(ge=1999, le=2100)],
    week: Annotated[int | None, Query(ge=1, le=22)] = None,
) -> LeagueScoringAudit:
    try:
        return await LeagueScoringAuditService(client).get_audit(league_id, season, week)
    except NflverseUnavailableError as exc:
        raise HTTPException(503, str(exc)) from exc
    except (SleeperNotFoundError, SleeperPayloadError, SleeperUnavailableError) as exc:
        raise error(exc) from exc
