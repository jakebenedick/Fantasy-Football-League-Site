import asyncio
from dataclasses import dataclass
from time import monotonic

from app.integrations.sleeper.client import SleeperClient
from app.integrations.sleeper.models import (
    SleeperBracketMatch,
    SleeperDraft,
    SleeperDraftPick,
    SleeperLeague,
    SleeperLeagueMember,
    SleeperMatchup,
    SleeperRoster,
    SleeperTransaction,
)
from app.services.draft_results import build_pick_numbers


@dataclass(frozen=True)
class HistorySeasonSnapshot:
    league: SleeperLeague
    rosters: list[SleeperRoster]
    members: list[SleeperLeagueMember]
    transactions: list[SleeperTransaction]
    drafts: list[SleeperDraft]
    draft_picks: list[SleeperDraftPick]
    bracket: list[SleeperBracketMatch]
    weekly_matchups: list[tuple[int, SleeperMatchup]]
    roster_names: dict[int, str]
    owners_by_roster: dict[int, str]
    pick_numbers: dict[tuple[str, int, int], int]


@dataclass(frozen=True)
class LeagueHistorySnapshot:
    root_league_id: str
    seasons: list[HistorySeasonSnapshot]
    pick_numbers: dict[tuple[str, int, int], int]


@dataclass(frozen=True)
class OriginalPlayer:
    owner_id: str
    drafted_season: str
    pick_number: int


_CACHE_TTL_SECONDS = 300
_cache: dict[str, tuple[float, LeagueHistorySnapshot]] = {}
_locks: dict[str, asyncio.Lock] = {}


class LeagueHistoryRepository:
    """Canonical, reusable ingestion of a Sleeper dynasty league's full history."""

    def __init__(self, client: SleeperClient) -> None:
        self._client = client

    async def load(self, league_id: str) -> LeagueHistorySnapshot:
        cached = _cache.get(league_id)
        if cached and monotonic() - cached[0] < _CACHE_TTL_SECONDS:
            return cached[1]
        lock = _locks.setdefault(league_id, asyncio.Lock())
        async with lock:
            cached = _cache.get(league_id)
            if cached and monotonic() - cached[0] < _CACHE_TTL_SECONDS:
                return cached[1]
            snapshot = await self._compile(league_id)
            _cache[league_id] = (monotonic(), snapshot)
            return snapshot

    async def _compile(self, league_id: str) -> LeagueHistorySnapshot:
        seasons: list[HistorySeasonSnapshot] = []
        current_id: str | None = league_id
        for _ in range(10):
            if not current_id:
                break
            league = await self._client.get_league(current_id)
            (
                rosters,
                members,
                transaction_batches,
                matchup_batches,
                drafts,
                bracket,
            ) = await asyncio.gather(
                self._client.get_rosters(current_id),
                self._client.get_members(current_id),
                asyncio.gather(
                    *(self._client.get_transactions(current_id, week) for week in range(1, 19))
                ),
                asyncio.gather(
                    *(self._client.get_matchups(current_id, week) for week in range(1, 19))
                ),
                self._client.get_drafts(current_id),
                self._client.get_winners_bracket(current_id),
            )
            member_names = {member.user_id: member.display_name for member in members}
            roster_names = {
                roster.roster_id: member_names.get(
                    roster.owner_id or "", f"Team {roster.roster_id}"
                )
                for roster in rosters
            }
            transactions_by_id = {
                transaction.transaction_id: transaction
                for batch in transaction_batches
                for transaction in batch
            }
            completed_drafts = [draft for draft in drafts if draft.status == "complete"]
            draft_results = await asyncio.gather(
                *(self._client.get_draft_picks(draft.draft_id) for draft in completed_drafts)
            )
            seasons.append(
                HistorySeasonSnapshot(
                    league=league,
                    rosters=rosters,
                    members=members,
                    transactions=list(transactions_by_id.values()),
                    drafts=drafts,
                    draft_picks=[pick for result in draft_results for pick in result],
                    bracket=bracket,
                    weekly_matchups=[
                        (week, matchup)
                        for week, matchups in enumerate(matchup_batches, start=1)
                        for matchup in matchups
                    ],
                    roster_names=roster_names,
                    owners_by_roster={
                        roster.roster_id: roster.owner_id for roster in rosters if roster.owner_id
                    },
                    pick_numbers=build_pick_numbers(
                        completed_drafts,
                        list(draft_results),
                        {
                            roster.owner_id: roster.roster_id
                            for roster in rosters
                            if roster.owner_id
                        },
                    ),
                )
            )
            current_id = league.previous_league_id
        dynasty_pick_numbers = {
            key: value for season in seasons for key, value in season.pick_numbers.items()
        }
        return LeagueHistorySnapshot(
            root_league_id=league_id,
            seasons=seasons,
            pick_numbers=dynasty_pick_numbers,
        )

    def original_players(self, snapshot: LeagueHistorySnapshot) -> dict[str, OriginalPlayer]:
        drafted: dict[str, OriginalPlayer] = {}
        for season in reversed(snapshot.seasons):
            for pick in season.draft_picks:
                owner_id = season.owners_by_roster.get(pick.roster_id)
                if owner_id:
                    drafted[pick.player_id] = OriginalPlayer(
                        owner_id=owner_id,
                        drafted_season=season.league.season,
                        pick_number=pick.pick_no,
                    )
        departed: set[str] = set()
        for season in reversed(snapshot.seasons):
            for transaction in season.transactions:
                for player_id, source_roster_id in (transaction.drops or {}).items():
                    original = drafted.get(player_id)
                    if not original:
                        continue
                    source_owner = season.owners_by_roster.get(source_roster_id)
                    destination_roster_id = (transaction.adds or {}).get(player_id)
                    destination_owner = (
                        season.owners_by_roster.get(destination_roster_id)
                        if destination_roster_id is not None
                        else None
                    )
                    if source_owner == original.owner_id and destination_owner != original.owner_id:
                        departed.add(player_id)
        return {
            player_id: original
            for player_id, original in drafted.items()
            if player_id not in departed
        }


def clear_history_cache() -> None:
    _cache.clear()
