import asyncio
import time
from typing import Any, TypeVar
import httpx
from pydantic import BaseModel, TypeAdapter, ValidationError
from app.integrations.sleeper.models import (
    SleeperLeague,
    SleeperLeagueMember,
    SleeperMatchup,
    SleeperDraft,
    SleeperDraftPick,
    SleeperBracketMatch,
    SleeperPlayer,
    SleeperRoster,
    SleeperTradedPick,
    SleeperTransaction,
    SleeperUser,
)

T = TypeVar("T", bound=BaseModel)
PLAYER_CACHE_SECONDS = 24 * 60 * 60
_player_cache: tuple[float, dict[str, SleeperPlayer]] | None = None
_player_cache_lock = asyncio.Lock()
_defense_stats_cache: dict[
    tuple[int, int | None], tuple[float, dict[str, dict[str, Any]]]
] = {}
_defense_stats_cache_lock = asyncio.Lock()


class SleeperError(Exception):
    pass


class SleeperNotFoundError(SleeperError):
    pass


class SleeperUnavailableError(SleeperError):
    pass


class SleeperPayloadError(SleeperError):
    pass


class SleeperClient:
    def __init__(self, http: httpx.AsyncClient) -> None:
        self._http = http

    async def _get_json(self, path: str) -> Any:
        try:
            response = await self._http.get(path)
            if response.status_code == 404:
                raise SleeperNotFoundError(f"Sleeper resource not found: {path}")
            response.raise_for_status()
            return response.json()
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise SleeperUnavailableError("Sleeper is temporarily unavailable") from exc
        except httpx.HTTPStatusError as exc:
            raise SleeperUnavailableError(
                f"Sleeper returned HTTP {exc.response.status_code}"
            ) from exc
        except ValueError as exc:
            raise SleeperPayloadError("Sleeper returned invalid JSON") from exc

    @staticmethod
    def _one(model: type[T], payload: Any) -> T:
        try:
            return model.model_validate(payload)
        except ValidationError as exc:
            raise SleeperPayloadError("Unexpected Sleeper response") from exc

    @staticmethod
    def _many(model: type[T], payload: Any) -> list[T]:
        try:
            return TypeAdapter(list[model]).validate_python(payload)  # type: ignore[valid-type]
        except ValidationError as exc:
            raise SleeperPayloadError("Unexpected Sleeper response") from exc

    async def get_user(self, username: str) -> SleeperUser:
        payload = await self._get_json(f"/user/{username}")
        if payload is None:
            raise SleeperNotFoundError(f"Sleeper user '{username}' was not found")
        return self._one(SleeperUser, payload)

    async def get_leagues(self, user_id: str, season: int) -> list[SleeperLeague]:
        return self._many(
            SleeperLeague, await self._get_json(f"/user/{user_id}/leagues/nfl/{season}")
        )

    async def get_league(self, league_id: str) -> SleeperLeague:
        return self._one(SleeperLeague, await self._get_json(f"/league/{league_id}"))

    async def get_rosters(self, league_id: str) -> list[SleeperRoster]:
        return self._many(SleeperRoster, await self._get_json(f"/league/{league_id}/rosters"))

    async def get_members(self, league_id: str) -> list[SleeperLeagueMember]:
        return self._many(SleeperLeagueMember, await self._get_json(f"/league/{league_id}/users"))

    async def get_matchups(self, league_id: str, week: int) -> list[SleeperMatchup]:
        return self._many(
            SleeperMatchup,
            await self._get_json(f"/league/{league_id}/matchups/{week}"),
        )

    async def get_players(self, player_ids: set[str] | None = None) -> dict[str, SleeperPlayer]:
        """Return the cached NFL catalog, optionally restricted to requested IDs."""
        global _player_cache
        now = time.monotonic()
        if _player_cache is None or now - _player_cache[0] >= PLAYER_CACHE_SECONDS:
            async with _player_cache_lock:
                now = time.monotonic()
                if _player_cache is None or now - _player_cache[0] >= PLAYER_CACHE_SECONDS:
                    payload = await self._get_json("/players/nfl")
                    if not isinstance(payload, dict):
                        raise SleeperPayloadError("Unexpected Sleeper player response")
                    players: dict[str, SleeperPlayer] = {}
                    try:
                        for player_id, raw in payload.items():
                            if isinstance(raw, dict):
                                players[str(player_id)] = SleeperPlayer.model_validate(
                                    {**raw, "player_id": str(raw.get("player_id") or player_id)}
                                )
                    except ValidationError as exc:
                        raise SleeperPayloadError("Unexpected Sleeper player response") from exc
                    _player_cache = (now, players)
        catalog = _player_cache[1]
        return (
            catalog
            if player_ids is None
            else {key: catalog[key] for key in player_ids if key in catalog}
        )

    async def get_defense_stats(
        self, season: int, week: int | None = None
    ) -> dict[str, dict[str, Any]]:
        """Return Sleeper-adjudicated D/ST categories with an in-memory TTL."""
        cache_key = (season, week)
        now = time.monotonic()
        cached = _defense_stats_cache.get(cache_key)
        if cached is not None and now - cached[0] < PLAYER_CACHE_SECONDS:
            return cached[1]
        async with _defense_stats_cache_lock:
            now = time.monotonic()
            cached = _defense_stats_cache.get(cache_key)
            if cached is not None and now - cached[0] < PLAYER_CACHE_SECONDS:
                return cached[1]
            period = f"/{week}" if week is not None else ""
            payload = await self._get_json(
                f"https://api.sleeper.com/stats/nfl/{season}{period}"
                "?season_type=regular&position=DEF"
            )
            if not isinstance(payload, list):
                raise SleeperPayloadError("Unexpected Sleeper defense-stat response")
            result: dict[str, dict[str, Any]] = {}
            for item in payload:
                if not isinstance(item, dict) or not isinstance(item.get("stats"), dict):
                    continue
                player_id = item.get("player_id")
                if player_id:
                    result[str(player_id)] = item["stats"]
            _defense_stats_cache[cache_key] = (now, result)
            return result

    async def get_traded_picks(self, league_id: str) -> list[SleeperTradedPick]:
        return self._many(
            SleeperTradedPick,
            await self._get_json(f"/league/{league_id}/traded_picks"),
        )

    async def get_drafts(self, league_id: str) -> list[SleeperDraft]:
        return self._many(
            SleeperDraft,
            await self._get_json(f"/league/{league_id}/drafts"),
        )

    async def get_draft_picks(self, draft_id: str) -> list[SleeperDraftPick]:
        return self._many(SleeperDraftPick, await self._get_json(f"/draft/{draft_id}/picks"))

    async def get_winners_bracket(self, league_id: str) -> list[SleeperBracketMatch]:
        return self._many(
            SleeperBracketMatch,
            await self._get_json(f"/league/{league_id}/winners_bracket"),
        )

    async def get_transactions(self, league_id: str, round_number: int) -> list[SleeperTransaction]:
        return self._many(
            SleeperTransaction,
            await self._get_json(f"/league/{league_id}/transactions/{round_number}"),
        )
