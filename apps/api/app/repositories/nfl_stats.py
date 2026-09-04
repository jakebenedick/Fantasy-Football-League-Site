import asyncio
import math
from collections.abc import Sequence
from typing import Any

import psycopg
from psycopg.types.json import Jsonb


class NflStatsRepository:
    """PostgreSQL storage for public nflverse weekly player statistics only."""

    def __init__(self, database_url: str | None) -> None:
        self._database_url = database_url
        self._schema_ready = False
        self._schema_lock = asyncio.Lock()

    @property
    def configured(self) -> bool:
        return bool(self._database_url)

    async def ensure_schema(self) -> None:
        if not self.configured or self._schema_ready:
            return
        async with self._schema_lock:
            if self._schema_ready:
                return
            await asyncio.to_thread(self._ensure_schema_sync)
            self._schema_ready = True

    def _connect(self) -> psycopg.Connection[Any]:
        if not self._database_url:
            raise RuntimeError("DATABASE_URL is not configured")
        return psycopg.connect(self._database_url)

    @staticmethod
    def _json_value(value: Any) -> Any:
        if isinstance(value, float) and not math.isfinite(value):
            return None
        if isinstance(value, dict):
            return {key: NflStatsRepository._json_value(item) for key, item in value.items()}
        if isinstance(value, (list, tuple)):
            return [NflStatsRepository._json_value(item) for item in value]
        return value

    def _ensure_schema_sync(self) -> None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS nfl_stats_season_imports (
                    season INTEGER PRIMARY KEY,
                    row_count INTEGER NOT NULL,
                    source_url TEXT NOT NULL,
                    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS nfl_player_weekly_stats (
                    id BIGSERIAL PRIMARY KEY,
                    season INTEGER NOT NULL,
                    week INTEGER NOT NULL,
                    season_type TEXT NOT NULL,
                    player_id TEXT NOT NULL,
                    game_id TEXT NOT NULL DEFAULT '',
                    position TEXT,
                    statistics JSONB NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS nfl_player_weekly_stats_lookup_idx
                ON nfl_player_weekly_stats (player_id, season, week)
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS nfl_player_weekly_stats_season_idx
                ON nfl_player_weekly_stats (season)
                """
            )

    async def season_is_imported(self, season: int) -> bool:
        if not self.configured:
            return False
        await self.ensure_schema()
        return await asyncio.to_thread(self._season_is_imported_sync, season)

    def _season_is_imported_sync(self, season: int) -> bool:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM nfl_stats_season_imports WHERE season = %s",
                (season,),
            )
            return cursor.fetchone() is not None

    async def player_rows(self, season: int, player_id: str) -> list[dict[str, Any]]:
        if not self.configured:
            return []
        await self.ensure_schema()
        return await asyncio.to_thread(self._player_rows_sync, season, player_id)

    def _player_rows_sync(self, season: int, player_id: str) -> list[dict[str, Any]]:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT statistics
                FROM nfl_player_weekly_stats
                WHERE season = %s AND player_id = %s
                ORDER BY week, game_id
                """,
                (season, player_id),
            )
            return [dict(row[0]) for row in cursor.fetchall()]

    async def replace_season(
        self,
        season: int,
        rows: Sequence[dict[str, Any]],
        source_url: str,
    ) -> None:
        if not self.configured:
            return
        await self.ensure_schema()
        await asyncio.to_thread(self._replace_season_sync, season, rows, source_url)

    def _replace_season_sync(
        self,
        season: int,
        rows: Sequence[dict[str, Any]],
        source_url: str,
    ) -> None:
        values = []
        for row in rows:
            values.append(
                (
                    season,
                    int(row.get("week") or 0),
                    str(row.get("season_type") or ""),
                    str(row.get("player_id") or ""),
                    str(row.get("game_id") or ""),
                    str(row["position"]) if row.get("position") else None,
                    Jsonb(self._json_value(row)),
                )
            )
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", (season,))
            cursor.execute(
                "SELECT 1 FROM nfl_stats_season_imports WHERE season = %s",
                (season,),
            )
            if cursor.fetchone() is not None:
                return
            with cursor.copy(
                """
                COPY nfl_player_weekly_stats
                    (season, week, season_type, player_id, game_id, position, statistics)
                FROM STDIN
                """
            ) as copy:
                for value in values:
                    copy.write_row(value)
            cursor.execute(
                """
                INSERT INTO nfl_stats_season_imports (season, row_count, source_url)
                VALUES (%s, %s, %s)
                """,
                (season, len(values), source_url),
            )
