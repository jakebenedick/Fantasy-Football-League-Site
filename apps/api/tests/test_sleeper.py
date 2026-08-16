import httpx
import pytest
import app.integrations.sleeper.client as sleeper_client_module
from app.main import app
from app.integrations.sleeper.client import SleeperClient, SleeperNotFoundError, SleeperPayloadError
from app.services.league_import import LeagueImportService
from app.services.league_import import normalize_player
from app.services.history_repository import clear_history_cache
from app.services.draft_results import build_pick_numbers, completed_pick_label, get_pick_numbers
from app.integrations.sleeper.models import SleeperDraft, SleeperDraftPick
from app.services.scoring_audit import (
    aggregate_statistics,
    attach_value_outlooks,
    assign_player_ranks,
    build_defense_game_rows,
    calculate_breakdown,
)
from app.domain.models import PlayerScoringAudit


def test_scoring_breakdown_applies_league_multipliers_and_weekly_bonuses() -> None:
    total, breakdown = calculate_breakdown(
        [
            {
                "passing_yards": 320,
                "passing_tds": 2,
                "passing_interceptions": 1,
                "rushing_yards": 20,
            },
            {
                "passing_yards": 280,
                "passing_tds": 1,
                "passing_interceptions": 0,
                "rushing_yards": 10,
            },
        ],
        {
            "pass_yd": 0.04,
            "pass_td": 4,
            "pass_int": -2,
            "rush_yd": 0.1,
            "bonus_pass_yd_300": 3,
        },
    )
    assert total == 40.0
    assert {item.scoring_key: item.points for item in breakdown} == {
        "pass_yd": 24.0,
        "pass_td": 12.0,
        "pass_int": -2.0,
        "rush_yd": 3.0,
        "bonus_pass_yd_300": 3.0,
    }


def test_scoring_breakdown_ignores_rules_that_are_not_configured() -> None:
    total, breakdown = calculate_breakdown(
        [{"receptions": 8, "receiving_yards": 100, "receiving_tds": 1}],
        {"rec": 0.5, "rec_yd": 0.1},
    )
    assert total == 14.0
    assert [item.scoring_key for item in breakdown] == ["rec", "rec_yd"]


def test_statistics_are_available_independently_of_scoring_rules() -> None:
    statistics = aggregate_statistics(
        [
            {
                "passing_yards": 250,
                "passing_tds": 2,
                "carries": 5,
                "rushing_yards": 30,
                "rushing_tds": 1,
            }
        ]
    )
    assert statistics["pass_yd"] == 250
    assert statistics["rush_yd"] == 30
    assert statistics["total_td"] == 3


def test_rate_statistics_use_aggregated_numerators_and_denominators() -> None:
    statistics = aggregate_statistics(
        [
            {
                "targets": 10,
                "receptions": 5,
                "receiving_yards": 80,
                "receiving_air_yards": 100,
                "receiving_yards_after_catch": 30,
                "target_share": 0.2,
                "air_yards_share": 0.25,
            },
            {
                "targets": 5,
                "receptions": 5,
                "receiving_yards": 70,
                "receiving_air_yards": 50,
                "receiving_yards_after_catch": 40,
                "target_share": 0.1,
                "air_yards_share": 0.125,
            },
        ]
    )
    assert statistics["catch_rate"] == pytest.approx(66.667, abs=0.001)
    assert statistics["yd_per_target"] == 10
    assert statistics["adot"] == 10
    assert statistics["target_share"] == 15
    assert statistics["air_yd_share"] == 18.75
    assert statistics["racr"] == 1


def test_dynasty_outlook_matches_by_name_and_preserves_source_context() -> None:
    players = [
        PlayerScoringAudit(
            sleeper_player_id="allen",
            player_name="Josh Allen",
            manager_name="Manager",
            position="QB",
        )
    ]
    matched = attach_value_outlooks(
        players,
        [
            {
                "ecr_type": "do",
                "player": "Josh Allen",
                "pos": "QB",
                "ecr": 4.2,
                "best": 1,
                "worst": 9,
                "sd": 2.1,
                "scrape_date": "2026-08-15",
            }
        ],
        superflex=False,
    )
    assert matched == 1
    assert players[0].value_outlook is not None
    assert players[0].value_outlook.ecr == 4.2
    assert players[0].value_outlook.position_rank == 1
    assert players[0].value_outlook.source == "FantasyPros via DynastyProcess"


def test_player_ranks_include_position_and_overall_order() -> None:
    players = [
        PlayerScoringAudit(
            sleeper_player_id="allen",
            player_name="Josh Allen",
            manager_name="Manager",
            position="QB",
            fantasy_points=374.6,
        ),
        PlayerScoringAudit(
            sleeper_player_id="mccaffrey",
            player_name="Christian McCaffrey",
            manager_name="Manager",
            position="RB",
            fantasy_points=365.6,
        ),
        PlayerScoringAudit(
            sleeper_player_id="maye",
            player_name="Drake Maye",
            manager_name="Manager",
            position="QB",
            fantasy_points=359.5,
        ),
    ]
    assign_player_ranks(players)
    assert (players[0].position_rank, players[0].overall_rank) == (1, 1)
    assert (players[1].position_rank, players[1].overall_rank) == (1, 2)
    assert (players[2].position_rank, players[2].overall_rank) == (2, 3)


def test_defensive_touchdown_is_removed_from_opposing_dst_points_allowed() -> None:
    common = {
        "game_id": "2025_01_IND_DAL",
        "season_type": "REG",
        "week": 1,
        "home_team": "DAL",
        "away_team": "IND",
        "total_home_score": 14,
        "total_away_score": 7,
    }
    rows = build_defense_game_rows(
        [
            {
                **common,
                "posteam": "IND",
                "defteam": "DAL",
                "touchdown": 1,
                "td_team": "DAL",
                "special_teams_play": 0,
                "interception": 1,
            },
            {**common, "posteam": "DAL", "defteam": "IND"},
        ]
    )
    by_team = {row["team"]: row for row in rows}
    assert by_team["IND"]["points_allowed"] == 8  # 14 final minus the pick-six, not its PAT.
    assert by_team["DAL"]["def_tds"] == 1
    assert by_team["DAL"]["def_interceptions"] == 1


def test_fumbles_are_credited_to_explicit_event_teams() -> None:
    common = {
        "game_id": "2025_14_LAC_PHI",
        "season_type": "REG",
        "week": 14,
        "home_team": "PHI",
        "away_team": "LAC",
        "total_home_score": 17,
        "total_away_score": 14,
    }
    rows = build_defense_game_rows(
        [
            {
                **common,
                "posteam": "PHI",
                "defteam": "LAC",
                "interception": 1,
                "fumble_lost": 1,
                "forced_fumble_player_1_team": "PHI",
                "forced_fumble_player_2_team": "LAC",
                "fumble_recovery_1_team": "PHI",
                "fumble_recovery_2_team": "LAC",
            },
            {
                **{
                    **common,
                    "game_id": "2025_09_HOU_DEN",
                    "week": 9,
                    "home_team": "HOU",
                    "away_team": "DEN",
                    "total_home_score": 21,
                    "total_away_score": 10,
                },
                "posteam": "HOU",
                "defteam": "DEN",
                "play_type": "punt",
                "fumble_lost": 1,
                "forced_fumble_player_1_team": "HOU",
                "fumble_recovery_1_team": "HOU",
            },
        ]
    )
    by_team = {row["team"]: row for row in rows}
    # Sleeper credits the original offense with the recovery after an
    # interception return, but not with a defensive forced fumble.
    assert by_team["PHI"]["def_fumbles_forced"] == 0
    assert by_team["PHI"]["fumble_recovery_opp"] == 1
    assert by_team["LAC"]["def_fumbles_forced"] == 1
    assert by_team["LAC"]["fumble_recovery_opp"] == 1
    assert by_team["HOU"]["def_st_fumbles_forced"] == 1
    assert by_team["HOU"]["def_st_fumbles_recovered"] == 1


def test_anonymous_and_multiple_forced_fumbles_are_counted() -> None:
    common = {
        "game_id": "2025_06_DAL_CAR",
        "season_type": "REG",
        "week": 6,
        "home_team": "CAR",
        "away_team": "DAL",
        "total_home_score": 20,
        "total_away_score": 17,
        "posteam": "CAR",
        "defteam": "DAL",
    }
    rows = build_defense_game_rows(
        [
            {
                **common,
                "fumble": 1,
                "forced_fumble_player_1_team": "DAL",
                "forced_fumble_player_2_team": "DAL",
            },
            {
                **common,
                "fumble": 1,
                "fumble_forced": 1,
                "fumble_lost": 0,
            },
        ]
    )
    by_team = {row["team"]: row for row in rows}
    assert by_team["DAL"]["def_fumbles_forced"] == 3


def test_scoring_plays_are_not_fourth_down_stops_but_kneels_are() -> None:
    common = {
        "game_id": "2025_02_CLE_BAL",
        "season_type": "REG",
        "week": 2,
        "home_team": "BAL",
        "away_team": "CLE",
        "total_home_score": 30,
        "total_away_score": 10,
        "posteam": "CLE",
        "defteam": "BAL",
        "fourth_down_failed": 1,
    }
    rows = build_defense_game_rows(
        [
            {**common, "touchdown": 1, "td_team": "BAL"},
            {**common, "safety": 1},
            {**common, "play_type": "qb_kneel"},
        ]
    )
    by_team = {row["team"]: row for row in rows}
    assert by_team["BAL"]["def_4_and_stops"] == 1


def make(handler: httpx.MockTransport) -> SleeperClient:
    return SleeperClient(httpx.AsyncClient(transport=handler, base_url="https://test"))


def test_application_imports_with_all_history_services() -> None:
    assert app.title


@pytest.mark.asyncio
async def test_user_contract() -> None:
    client = make(
        httpx.MockTransport(
            lambda r: httpx.Response(
                200,
                json={"user_id": "u1", "username": "coach", "display_name": "Coach", "extra": 1},
            )
        )
    )
    assert (await client.get_user("coach")).user_id == "u1"


@pytest.mark.asyncio
async def test_null_user_not_found() -> None:
    with pytest.raises(SleeperNotFoundError):
        await make(httpx.MockTransport(lambda r: httpx.Response(200, content=b"null"))).get_user(
            "x"
        )


@pytest.mark.asyncio
async def test_bad_user_rejected() -> None:
    with pytest.raises(SleeperPayloadError):
        await make(
            httpx.MockTransport(lambda r: httpx.Response(200, json={"username": "x"}))
        ).get_user("x")


@pytest.mark.asyncio
async def test_import_identifies_roster() -> None:
    sleeper_client_module._player_cache = None
    clear_history_cache()
    data = {
        "/user/coach": {"user_id": "u1", "username": "coach", "display_name": "Coach"},
        "/league/l1": {
            "league_id": "l1",
            "name": "League",
            "season": "2025",
            "status": "in_season",
            "total_rosters": 1,
            "roster_positions": ["QB", "FLEX", "BN"],
            "settings": {"taxi_slots": 3},
        },
        "/league/l1/rosters": [
            {
                "roster_id": 1,
                "owner_id": "u1",
                "players": ["p1", "p2"],
                "starters": ["p1"],
                "taxi": ["p2"],
                "reserve": None,
            }
        ],
        "/league/l1/users": [{"user_id": "u1", "display_name": "Coach"}],
        "/league/l1/traded_picks": [
            {"season": "2025", "round": 2, "roster_id": 1, "previous_owner_id": 1, "owner_id": 1}
        ],
        "/league/l1/drafts": [
            {
                "draft_id": "d1",
                "league_id": "l1",
                "season": "2025",
                "status": "complete",
                "type": "linear",
            }
        ],
        "/league/l1/winners_bracket": [],
        "/draft/d1/picks": [
            {
                "player_id": "p1",
                "roster_id": 1,
                "round": 1,
                "pick_no": 1,
                "draft_id": "d1",
                "draft_slot": 1,
            }
        ],
        "/players/nfl": {
            "p1": {
                "player_id": "p1",
                "first_name": "Test",
                "last_name": "Quarterback",
                "position": "QB",
                "fantasy_positions": ["QB"],
                "team": "BUF",
                "status": "Active",
            },
            "p2": {
                "player_id": "p2",
                "first_name": "Taxi",
                "last_name": "Player",
                "position": "RB",
                "fantasy_positions": ["RB"],
            },
        },
    }

    def handler(request: httpx.Request) -> httpx.Response:
        if "/transactions/" in request.url.path:
            return httpx.Response(200, json=[])
        return httpx.Response(200, json=data[request.url.path])

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport, base_url="https://test") as http:
        result = await LeagueImportService(SleeperClient(http)).import_for_user("coach", "l1")
    assert result.selected_roster and result.selected_roster.roster_id == 1
    assert result.players["p1"].full_name == "Test Quarterback"
    assert result.players["p1"].eligible_positions == ["QB"]
    assert result.players["p1"].avatar_url is None  # Non-numeric fixture IDs use the UI fallback.
    assert result.players["p1"].is_og is True
    assert result.players["p2"].is_og is False
    assert all(pick.season != "2025" for pick in result.rosters[0].draft_picks)
    assert any(pick.season == "2026" for pick in result.rosters[0].draft_picks)
    assert result.league.taxi_slots == 3
    assert result.rosters[0].taxi == ["p2"]
    assert result.source.provider == "sleeper"


@pytest.mark.asyncio
async def test_players_are_filtered_and_cached() -> None:
    sleeper_client_module._player_cache = None
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(
            200,
            json={
                "p1": {"first_name": "One", "last_name": "Player", "position": "RB"},
                "p2": {"first_name": "Two", "last_name": "Player", "position": "WR"},
            },
        )

    client = make(httpx.MockTransport(handler))
    assert set(await client.get_players({"p1"})) == {"p1"}
    assert set(await client.get_players({"p2"})) == {"p2"}
    assert calls == 1


@pytest.mark.asyncio
async def test_defense_stats_are_normalized_and_cached() -> None:
    sleeper_client_module._defense_stats_cache.clear()
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(
            200,
            json=[
                {"player_id": "NO", "stats": {"ff": 12, "def_4_and_stop": 16}},
                {"player_id": "bad", "stats": None},
            ],
        )

    client = make(httpx.MockTransport(handler))
    assert (await client.get_defense_stats(2025))["NO"]["ff"] == 12
    assert (await client.get_defense_stats(2025))["NO"]["def_4_and_stop"] == 16
    assert calls == 1


@pytest.mark.asyncio
async def test_player_catalog_accepts_nullable_and_string_fields() -> None:
    sleeper_client_module._player_cache = None
    payload = {
        "p1": {
            "first_name": "Flexible",
            "last_name": "Payload",
            "position": "WR",
            "fantasy_positions": None,
            "number": "",
            "age": "26",
        }
    }
    client = make(httpx.MockTransport(lambda request: httpx.Response(200, json=payload)))
    player = (await client.get_players({"p1"}))["p1"]
    assert player.fantasy_positions is None
    assert player.number == ""
    assert player.age == "26"
    normalized = normalize_player("p1", player)
    assert normalized.age == 26
    assert normalized.number is None
    assert normalized.eligible_positions == ["WR"]


@pytest.mark.asyncio
async def test_completed_traded_pick_resolves_to_overall_number() -> None:
    client = make(
        httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json=[
                    {
                        "player_id": "p17",
                        "roster_id": 4,
                        "round": 2,
                        "pick_no": 17,
                        "draft_id": "d2025",
                        "draft_slot": 4,
                    }
                ],
            )
        )
    )
    numbers = await get_pick_numbers(
        client,
        [
            SleeperDraft(
                draft_id="d2025",
                league_id="l2025",
                season="2025",
                status="complete",
                slot_to_roster_id={"4": 4},
            )
        ],
    )
    assert numbers[("2025", 2, 4)] == 17
    assert completed_pick_label("2025", 2, 4, numbers) == "2025, Round 2, Pick 17 overall"
    assert completed_pick_label("2026", 1, 4, numbers) == "2026 Round 1"


@pytest.mark.asyncio
async def test_traded_completed_pick_resolves_by_original_draft_slot() -> None:
    client = make(
        httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json=[
                    {
                        "player_id": "p17",
                        "roster_id": 9,
                        "round": 2,
                        "pick_no": 17,
                        "draft_id": "d2025",
                        "draft_slot": 4,
                    }
                ],
            )
        )
    )
    numbers = await get_pick_numbers(
        client,
        [
            SleeperDraft(
                draft_id="d2025",
                league_id="l2025",
                season="2025",
                status="complete",
                slot_to_roster_id={"4": 4},
            )
        ],
    )
    assert numbers[("2025", 2, 4)] == 17
    assert ("2025", 2, 9) not in numbers


def test_draft_order_resolves_original_roster_when_slot_map_is_missing() -> None:
    draft = SleeperDraft(
        draft_id="d2026",
        league_id="l2026",
        season="2026",
        status="complete",
        draft_order={"owner-4": 7},
    )
    pick = SleeperDraftPick(
        player_id="p17",
        roster_id=9,
        round=2,
        pick_no=17,
        draft_id="d2026",
        draft_slot=7,
    )
    numbers = build_pick_numbers([draft], [[pick]], {"owner-4": 4})
    assert numbers[("2026", 2, 4)] == 17
