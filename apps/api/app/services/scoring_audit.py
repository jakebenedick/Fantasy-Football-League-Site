import asyncio
from datetime import datetime, timezone
from typing import Any

import nflreadpy as nfl  # type: ignore[import-untyped]
import polars as pl

from app.domain.models import (
    LeagueScoringAudit,
    PlayerScoringAudit,
    PlayerValueOutlook,
    ScoringBreakdownItem,
    SourceMetadata,
    StatisticDefinition,
)
from app.integrations.sleeper.client import SleeperClient


class NflverseUnavailableError(Exception):
    pass


# Sleeper scoring key -> (nflverse player-stat column, human label).
# Scoring is performed on each weekly row before aggregation so weekly bonuses are correct.
STAT_RULES: dict[str, tuple[str, str]] = {
    "pass_cmp": ("completions", "Pass completions"),
    "pass_att": ("attempts", "Pass attempts"),
    "pass_yd": ("passing_yards", "Passing yards"),
    "pass_td": ("passing_tds", "Passing touchdowns"),
    "pass_int": ("passing_interceptions", "Interceptions thrown"),
    "pass_2pt": ("passing_2pt_conversions", "Passing two-point conversions"),
    "pass_fd": ("passing_first_downs", "Passing first downs"),
    "rush_att": ("carries", "Rushing attempts"),
    "rush_yd": ("rushing_yards", "Rushing yards"),
    "rush_td": ("rushing_tds", "Rushing touchdowns"),
    "rush_2pt": ("rushing_2pt_conversions", "Rushing two-point conversions"),
    "rush_fd": ("rushing_first_downs", "Rushing first downs"),
    "rec": ("receptions", "Receptions"),
    "rec_yd": ("receiving_yards", "Receiving yards"),
    "rec_td": ("receiving_tds", "Receiving touchdowns"),
    "rec_2pt": ("receiving_2pt_conversions", "Receiving two-point conversions"),
    "rec_fd": ("receiving_first_downs", "Receiving first downs"),
    "fum_lost": ("fumbles_lost_total", "Fumbles lost"),
    "st_td": ("special_teams_tds", "Special-teams touchdowns"),
    "xpm": ("pat_made", "Extra points made"),
    "xpmiss": ("pat_missed", "Extra points missed"),
    "fgm": ("fg_made", "Field goals made"),
    "fgmiss": ("fg_missed", "Field goals missed"),
    "fgm_0_19": ("fg_made_0_19", "Field goals made: 0–19"),
    "fgm_20_29": ("fg_made_20_29", "Field goals made: 20–29"),
    "fgm_30_39": ("fg_made_30_39", "Field goals made: 30–39"),
    "fgm_40_49": ("fg_made_40_49", "Field goals made: 40–49"),
    "fgm_50_59": ("fg_made_50_59", "Field goals made: 50–59"),
    "fgm_60p": ("fg_made_60_", "Field goals made: 60+"),
    "int": ("def_interceptions", "Defensive interceptions"),
    "ff": ("def_fumbles_forced", "Fumbles forced"),
    "fum_rec": ("fumble_recovery_opp", "Opponent fumbles recovered"),
    "fum_rec_td": ("fumble_recovery_tds", "Fumble-recovery touchdowns"),
    "sack": ("def_sacks", "Defensive sacks"),
    "safe": ("def_safeties", "Safeties"),
    "def_td": ("def_tds", "Defensive touchdowns"),
    "def_4_and_stop": ("def_4_and_stops", "Fourth-down stops"),
    "def_st_ff": ("def_st_fumbles_forced", "Special-teams fumbles forced"),
    "def_st_fum_rec": ("def_st_fumbles_recovered", "Special-teams fumbles recovered"),
    "def_st_td": ("def_st_tds", "Special-teams touchdowns"),
    "pts_allow_0": ("points_allowed_0", "Games allowing 0 points"),
    "pts_allow_1_6": ("points_allowed_1_6", "Games allowing 1–6 points"),
    "pts_allow_7_13": ("points_allowed_7_13", "Games allowing 7–13 points"),
    "pts_allow_14_20": ("points_allowed_14_20", "Games allowing 14–20 points"),
    "pts_allow_21_27": ("points_allowed_21_27", "Games allowing 21–27 points"),
    "pts_allow_28_34": ("points_allowed_28_34", "Games allowing 28–34 points"),
    "pts_allow_35p": ("points_allowed_35p", "Games allowing 35+ points"),
    "st_ff": ("st_fumbles_forced", "Player special-teams fumbles forced"),
    "st_fum_rec": ("st_fumbles_recovered", "Player special-teams fumbles recovered"),
}

COMPOSITE_STAT_RULES: dict[str, tuple[tuple[str, ...], str]] = {
    "fgm_50p": (("fg_made_50_59", "fg_made_60_"), "Field goals made: 50+"),
    "blk_kick": (
        ("def_punt_blocks", "def_pat_blocks", "def_fg_blocks"),
        "Kicks blocked",
    ),
}

BONUS_RULES: dict[str, tuple[str, float, str]] = {
    "bonus_pass_yd_300": ("passing_yards", 300, "300-yard passing games"),
    "bonus_pass_yd_400": ("passing_yards", 400, "400-yard passing games"),
    "bonus_rush_yd_100": ("rushing_yards", 100, "100-yard rushing games"),
    "bonus_rush_yd_200": ("rushing_yards", 200, "200-yard rushing games"),
    "bonus_rec_yd_100": ("receiving_yards", 100, "100-yard receiving games"),
    "bonus_rec_yd_200": ("receiving_yards", 200, "200-yard receiving games"),
}

EXTRA_TOTAL_STATS: dict[str, tuple[str, str, str, tuple[str, ...]]] = {
    "targets": ("targets", "Targets", "Opportunity", ("RB", "WR", "TE")),
    "air_yd": (
        "receiving_air_yards",
        "Air yards",
        "Opportunity",
        ("RB", "WR", "TE"),
    ),
    "yac": (
        "receiving_yards_after_catch",
        "Yards after catch",
        "Production",
        ("RB", "WR", "TE"),
    ),
    "pass_epa": ("passing_epa", "Passing EPA", "Advanced", ("QB",)),
    "rush_epa": ("rushing_epa", "Rushing EPA", "Advanced", ("QB", "RB", "WR")),
    "rec_epa": ("receiving_epa", "Receiving EPA", "Advanced", ("RB", "WR", "TE")),
}

DERIVED_STATISTICS: tuple[StatisticDefinition, ...] = (
    StatisticDefinition(
        key="completion_pct",
        label="Completion %",
        category="Efficiency",
        positions=["QB"],
        format="percent",
    ),
    StatisticDefinition(
        key="pass_yd_per_att",
        label="Pass yards/attempt",
        category="Efficiency",
        positions=["QB"],
        format="decimal",
    ),
    StatisticDefinition(
        key="pass_td_rate",
        label="Pass TD rate",
        category="Efficiency",
        positions=["QB"],
        format="percent",
    ),
    StatisticDefinition(
        key="int_rate",
        label="INT rate",
        category="Efficiency",
        positions=["QB"],
        format="percent",
    ),
    StatisticDefinition(
        key="yd_per_carry",
        label="Yards/carry",
        category="Efficiency",
        positions=["QB", "RB", "WR"],
        format="decimal",
    ),
    StatisticDefinition(
        key="catch_rate",
        label="Catch rate",
        category="Efficiency",
        positions=["RB", "WR", "TE"],
        format="percent",
    ),
    StatisticDefinition(
        key="yd_per_target",
        label="Yards/target",
        category="Efficiency",
        positions=["RB", "WR", "TE"],
        format="decimal",
    ),
    StatisticDefinition(
        key="yd_per_reception",
        label="Yards/reception",
        category="Efficiency",
        positions=["RB", "WR", "TE"],
        format="decimal",
    ),
    StatisticDefinition(
        key="adot",
        label="Average depth of target",
        category="Opportunity",
        positions=["RB", "WR", "TE"],
        format="decimal",
    ),
    StatisticDefinition(
        key="yac_per_reception",
        label="YAC/reception",
        category="Efficiency",
        positions=["RB", "WR", "TE"],
        format="decimal",
    ),
    StatisticDefinition(
        key="target_share",
        label="Target share",
        category="Opportunity",
        positions=["RB", "WR", "TE"],
        format="percent",
    ),
    StatisticDefinition(
        key="air_yd_share",
        label="Air-yards share",
        category="Opportunity",
        positions=["RB", "WR", "TE"],
        format="percent",
    ),
    StatisticDefinition(
        key="wopr",
        label="WOPR",
        category="Advanced",
        positions=["RB", "WR", "TE"],
        format="decimal",
    ),
    StatisticDefinition(
        key="racr",
        label="RACR",
        category="Advanced",
        positions=["RB", "WR", "TE"],
        format="decimal",
    ),
    StatisticDefinition(
        key="touches",
        label="Touches",
        category="Opportunity",
        positions=["RB", "WR", "TE"],
    ),
    StatisticDefinition(
        key="opportunities",
        label="Opportunities",
        category="Opportunity",
        positions=["RB", "WR", "TE"],
    ),
    StatisticDefinition(
        key="yd_per_touch",
        label="Yards/touch",
        category="Efficiency",
        positions=["RB", "WR", "TE"],
        format="decimal",
    ),
)


def statistic_catalog() -> list[StatisticDefinition]:
    direct = [
        StatisticDefinition(
            key=key,
            label=label,
            category=category,
            positions=list(positions),
        )
        for key, (_column, label, category, positions) in EXTRA_TOTAL_STATS.items()
    ]
    return direct + list(DERIVED_STATISTICS)

DEFENSE_NAMES = {
    "ARI": "Arizona Cardinals",
    "ATL": "Atlanta Falcons",
    "BAL": "Baltimore Ravens",
    "BUF": "Buffalo Bills",
    "CAR": "Carolina Panthers",
    "CHI": "Chicago Bears",
    "CIN": "Cincinnati Bengals",
    "CLE": "Cleveland Browns",
    "DAL": "Dallas Cowboys",
    "DEN": "Denver Broncos",
    "DET": "Detroit Lions",
    "GB": "Green Bay Packers",
    "HOU": "Houston Texans",
    "IND": "Indianapolis Colts",
    "JAX": "Jacksonville Jaguars",
    "KC": "Kansas City Chiefs",
    "LAC": "Los Angeles Chargers",
    "LAR": "Los Angeles Rams",
    "LV": "Las Vegas Raiders",
    "MIA": "Miami Dolphins",
    "MIN": "Minnesota Vikings",
    "NE": "New England Patriots",
    "NO": "New Orleans Saints",
    "NYG": "New York Giants",
    "NYJ": "New York Jets",
    "PHI": "Philadelphia Eagles",
    "PIT": "Pittsburgh Steelers",
    "SEA": "Seattle Seahawks",
    "SF": "San Francisco 49ers",
    "TB": "Tampa Bay Buccaneers",
    "TEN": "Tennessee Titans",
    "WAS": "Washington Commanders",
}

_id_map: dict[str, tuple[str, str, str | None]] | None = None
_fantasypros_by_sleeper: dict[str, str] = {}
_ranking_rows: list[dict[str, Any]] | None = None
_stats_by_season: dict[int, list[dict[str, Any]]] = {}
_defense_rows_by_season: dict[int, list[dict[str, Any]]] = {}
_special_team_player_rows_by_season: dict[int, list[dict[str, Any]]] = {}
_data_lock = asyncio.Lock()


def _number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def calculate_breakdown(
    rows: list[dict[str, Any]], scoring_settings: dict[str, float]
) -> tuple[float, list[ScoringBreakdownItem]]:
    breakdown: list[ScoringBreakdownItem] = []
    total = 0.0
    for key, (column, label) in STAT_RULES.items():
        multiplier = scoring_settings.get(key, 0.0)
        if multiplier == 0:
            continue
        statistic = sum(_number(row.get(column)) for row in rows)
        points = statistic * multiplier
        if statistic or points:
            breakdown.append(
                ScoringBreakdownItem(
                    scoring_key=key,
                    label=label,
                    statistic=round(statistic, 3),
                    multiplier=multiplier,
                    points=round(points, 3),
                )
            )
            total += points
    for key, (columns, label) in COMPOSITE_STAT_RULES.items():
        multiplier = scoring_settings.get(key, 0.0)
        if multiplier == 0:
            continue
        statistic = sum(sum(_number(row.get(column)) for column in columns) for row in rows)
        points = statistic * multiplier
        if statistic or points:
            breakdown.append(
                ScoringBreakdownItem(
                    scoring_key=key,
                    label=label,
                    statistic=round(statistic, 3),
                    multiplier=multiplier,
                    points=round(points, 3),
                )
            )
            total += points
    for key, (column, threshold, label) in BONUS_RULES.items():
        multiplier = scoring_settings.get(key, 0.0)
        if multiplier == 0:
            continue
        occurrences = float(sum(_number(row.get(column)) >= threshold for row in rows))
        points = occurrences * multiplier
        if occurrences:
            breakdown.append(
                ScoringBreakdownItem(
                    scoring_key=key,
                    label=label,
                    statistic=occurrences,
                    multiplier=multiplier,
                    points=round(points, 3),
                )
            )
            total += points
    return round(total, 3), breakdown


def aggregate_statistics(rows: list[dict[str, Any]]) -> dict[str, float]:
    """Expose normalized fantasy statistics independently of scoring weights."""
    statistics = {
        key: sum(_number(row.get(column)) for row in rows)
        for key, (column, _label) in STAT_RULES.items()
    }
    statistics.update(
        {
            key: sum(
                sum(_number(row.get(column)) for column in columns) for row in rows
            )
            for key, (columns, _label) in COMPOSITE_STAT_RULES.items()
        }
    )
    statistics["total_td"] = sum(
        statistics.get(key, 0)
        for key in ("pass_td", "rush_td", "rec_td", "st_td", "def_td", "def_st_td")
    )
    for key, (column, _label, _category, _positions) in EXTRA_TOTAL_STATS.items():
        statistics[key] = sum(_number(row.get(column)) for row in rows)

    def rate(numerator: float, denominator: float, scale: float = 1.0) -> float:
        return numerator / denominator * scale if denominator else 0.0

    statistics["completion_pct"] = rate(
        statistics.get("pass_cmp", 0), statistics.get("pass_att", 0), 100
    )
    statistics["pass_yd_per_att"] = rate(
        statistics.get("pass_yd", 0), statistics.get("pass_att", 0)
    )
    statistics["pass_td_rate"] = rate(
        statistics.get("pass_td", 0), statistics.get("pass_att", 0), 100
    )
    statistics["int_rate"] = rate(
        statistics.get("pass_int", 0), statistics.get("pass_att", 0), 100
    )
    statistics["yd_per_carry"] = rate(
        statistics.get("rush_yd", 0), statistics.get("rush_att", 0)
    )
    statistics["catch_rate"] = rate(
        statistics.get("rec", 0), statistics.get("targets", 0), 100
    )
    statistics["yd_per_target"] = rate(
        statistics.get("rec_yd", 0), statistics.get("targets", 0)
    )
    statistics["yd_per_reception"] = rate(
        statistics.get("rec_yd", 0), statistics.get("rec", 0)
    )
    statistics["adot"] = rate(
        statistics.get("air_yd", 0), statistics.get("targets", 0)
    )
    statistics["yac_per_reception"] = rate(
        statistics.get("yac", 0), statistics.get("rec", 0)
    )
    target_denominator = sum(
        _number(row.get("targets")) / _number(row.get("target_share"))
        for row in rows
        if _number(row.get("target_share")) > 0
    )
    air_yard_denominator = sum(
        _number(row.get("receiving_air_yards")) / _number(row.get("air_yards_share"))
        for row in rows
        if _number(row.get("air_yards_share")) > 0
    )
    target_share = rate(statistics.get("targets", 0), target_denominator)
    air_yard_share = rate(statistics.get("air_yd", 0), air_yard_denominator)
    statistics["target_share"] = target_share * 100
    statistics["air_yd_share"] = air_yard_share * 100
    statistics["wopr"] = 1.5 * target_share + 0.7 * air_yard_share
    statistics["racr"] = rate(statistics.get("rec_yd", 0), statistics.get("air_yd", 0))
    statistics["touches"] = statistics.get("rush_att", 0) + statistics.get("rec", 0)
    statistics["opportunities"] = statistics.get("rush_att", 0) + statistics.get(
        "targets", 0
    )
    statistics["yd_per_touch"] = rate(
        statistics.get("rush_yd", 0) + statistics.get("rec_yd", 0),
        statistics["touches"],
    )
    return {key: round(value, 3) for key, value in statistics.items()}


def assign_player_ranks(players: list[PlayerScoringAudit]) -> None:
    position_counts: dict[str, int] = {}
    for overall_rank, player in enumerate(players, start=1):
        player.overall_rank = overall_rank
        position_key = player.position or "—"
        position_counts[position_key] = position_counts.get(position_key, 0) + 1
        player.position_rank = position_counts[position_key]


def _normalize_sleeper_id(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = str(value).strip()
    return text if text and text.lower() not in {"nan", "none"} else None


async def _load_public_data(
    season: int,
) -> tuple[dict[str, tuple[str, str, str | None]], list[dict[str, Any]]]:
    global _id_map
    async with _data_lock:
        try:
            if _id_map is None:
                identifiers = await asyncio.to_thread(nfl.load_ff_playerids)
                mapping: dict[str, tuple[str, str, str | None]] = {}
                for row in identifiers.select(
                    [
                        column
                        for column in (
                            "sleeper_id",
                            "gsis_id",
                            "name",
                            "position",
                            "fantasypros_id",
                        )
                        if column in identifiers.columns
                    ]
                ).to_dicts():
                    sleeper_id = _normalize_sleeper_id(row.get("sleeper_id"))
                    gsis_id = row.get("gsis_id")
                    if sleeper_id and gsis_id:
                        mapping[sleeper_id] = (
                            str(gsis_id),
                            str(row.get("name") or sleeper_id),
                            str(row["position"]) if row.get("position") else None,
                        )
                    fantasypros_id = _normalize_sleeper_id(row.get("fantasypros_id"))
                    if sleeper_id and fantasypros_id:
                        _fantasypros_by_sleeper[sleeper_id] = fantasypros_id
                _id_map = mapping
            if season not in _stats_by_season:
                frame = await asyncio.to_thread(nfl.load_player_stats, [season])
                _stats_by_season[season] = frame.to_dicts()
        except Exception as exc:  # nflreadpy wraps several download/parser exception types.
            raise NflverseUnavailableError(
                "Public NFL scoring data is temporarily unavailable"
            ) from exc
    return _id_map, _stats_by_season[season]


def _normalized_player_name(value: Any) -> str:
    return "".join(character for character in str(value or "").lower() if character.isalnum())


def attach_value_outlooks(
    players: list[PlayerScoringAudit],
    ranking_rows: list[dict[str, Any]],
    *,
    superflex: bool,
) -> int:
    preferred_type = "dsf" if superflex else "do"
    candidates = [
        row
        for row in ranking_rows
        if str(row.get("ecr_type") or "").lower() == preferred_type
    ]
    if not candidates:
        candidates = [
            row
            for row in ranking_rows
            if "dynasty" in str(row.get("page_type") or "").lower()
            and (
                "superflex" in str(row.get("page_type") or "").lower()
                if superflex
                else "superflex" not in str(row.get("page_type") or "").lower()
            )
        ]
    by_id = {
        _normalize_sleeper_id(row.get("id")): row
        for row in candidates
        if _normalize_sleeper_id(row.get("id"))
    }
    by_name_position = {
        (
            _normalized_player_name(row.get("player")),
            str(row.get("pos") or "").upper(),
        ): row
        for row in candidates
    }
    matched: list[tuple[PlayerScoringAudit, dict[str, Any]]] = []
    for player in players:
        fantasypros_id = _fantasypros_by_sleeper.get(player.sleeper_player_id)
        row = by_id.get(fantasypros_id) if fantasypros_id else None
        if row is None:
            row = by_name_position.get(
                (_normalized_player_name(player.player_name), str(player.position or "").upper())
            )
        if row is not None and _number(row.get("ecr")) > 0:
            matched.append((player, row))
    matched.sort(key=lambda item: _number(item[1].get("ecr")))
    position_counts: dict[str, int] = {}
    for player, row in matched:
        position = player.position or "—"
        position_counts[position] = position_counts.get(position, 0) + 1
        ecr = _number(row.get("ecr"))
        player.value_outlook = PlayerValueOutlook(
            source="FantasyPros via DynastyProcess",
            ranking_format="Dynasty Superflex" if superflex else "Dynasty 1QB",
            effective_at=str(row.get("scrape_date")) if row.get("scrape_date") else None,
            ecr=round(ecr, 2),
            position_rank=position_counts[position],
            tier=max(1, int((ecr - 1) // 12) + 1),
            best_rank=_number(row.get("best")) or None,
            worst_rank=_number(row.get("worst")) or None,
            rank_standard_deviation=_number(row.get("sd")) or None,
            rank_delta=_number(row.get("rank_delta")) or None,
        )
    return len(matched)


async def _load_ranking_rows() -> list[dict[str, Any]]:
    global _ranking_rows
    async with _data_lock:
        if _ranking_rows is not None:
            return _ranking_rows
        try:
            frame = await asyncio.to_thread(nfl.load_ff_rankings, "draft")
            _ranking_rows = frame.to_dicts()
        except Exception:
            # Rankings enrich the experience but must never make historical statistics fail.
            _ranking_rows = []
    return _ranking_rows


def build_defense_game_rows(pbp_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    games: dict[str, list[dict[str, Any]]] = {}
    for row in pbp_rows:
        if row.get("season_type") == "REG" and row.get("game_id"):
            games.setdefault(str(row["game_id"]), []).append(row)
    results: list[dict[str, Any]] = []
    for rows in games.values():
        sample = rows[0]
        home = str(sample.get("home_team") or "")
        away = str(sample.get("away_team") or "")
        if not home or not away:
            continue
        final_home = int(max(_number(row.get("total_home_score")) for row in rows))
        final_away = int(max(_number(row.get("total_away_score")) for row in rows))
        metrics = {
            home: {"points_allowed": final_away},
            away: {"points_allowed": final_home},
        }
        for team in (home, away):
            metrics[team].update(
                {
                    "def_sacks": 0.0,
                    "def_interceptions": 0.0,
                    "def_fumbles_forced": 0.0,
                    "fumble_recovery_opp": 0.0,
                    "def_safeties": 0.0,
                    "def_punt_blocks": 0.0,
                    "def_pat_blocks": 0.0,
                    "def_fg_blocks": 0.0,
                    "def_tds": 0.0,
                    "def_4_and_stops": 0.0,
                    "def_st_fumbles_forced": 0.0,
                    "def_st_fumbles_recovered": 0.0,
                    "def_st_tds": 0.0,
                }
            )
        for play in rows:
            defense = play.get("defteam")
            offense = play.get("posteam")
            td_team = play.get("td_team")
            is_special = _number(play.get("special_teams_play")) == 1 or play.get(
                "play_type"
            ) in {"field_goal", "extra_point", "kickoff", "punt"}
            if defense in metrics:
                team_metrics = metrics[str(defense)]
                team_metrics["def_sacks"] += _number(play.get("sack"))
                team_metrics["def_interceptions"] += _number(play.get("interception"))
                team_metrics["def_safeties"] += _number(play.get("safety"))
                if not _number(play.get("touchdown")) and not _number(
                    play.get("safety")
                ):
                    team_metrics["def_4_and_stops"] += _number(
                        play.get("fourth_down_failed")
                    )
                if play.get("field_goal_result") == "blocked":
                    team_metrics["def_fg_blocks"] += 1
                if play.get("extra_point_result") == "blocked":
                    team_metrics["def_pat_blocks"] += 1
                team_metrics["def_punt_blocks"] += _number(play.get("punt_blocked"))
                if (
                    _number(play.get("touchdown"))
                    and td_team == defense
                    and not is_special
                ):
                    team_metrics["def_tds"] += 1
            # Fumbles can change possession more than once on one play, and a muffed
            # kick can be recovered by the nominal offense. Credit the explicit team
            # on each nflverse fumble event instead of assuming `defteam` owns it.
            forced_fumble_teams = [
                play.get("forced_fumble_player_1_team"),
                play.get("forced_fumble_player_2_team"),
            ]
            recovery_teams = {
                play.get("fumble_recovery_1_team"),
                play.get("fumble_recovery_2_team"),
            } - {None}
            for forced_fumble_team in forced_fumble_teams:
                if forced_fumble_team is None or forced_fumble_team not in metrics:
                    continue
                if not is_special and forced_fumble_team != defense:
                    continue
                key = "def_st_fumbles_forced" if is_special else "def_fumbles_forced"
                metrics[str(forced_fumble_team)][key] += 1
            has_explicit_forcer = any(team is not None for team in forced_fumble_teams)
            if (
                defense in metrics
                and not is_special
                and not has_explicit_forcer
                and _number(play.get("fumble_forced"))
            ):
                metrics[str(defense)]["def_fumbles_forced"] += 1
            if _number(play.get("fumble_lost")):
                for recovery_team in recovery_teams:
                    if recovery_team not in metrics:
                        continue
                    recovered_interception_return = (
                        _number(play.get("interception")) and recovery_team == offense
                    )
                    if not is_special and not (
                        recovery_team == defense or recovered_interception_return
                    ):
                        continue
                    key = (
                        "def_st_fumbles_recovered"
                        if is_special
                        else "fumble_recovery_opp"
                    )
                    metrics[str(recovery_team)][key] += 1
            if is_special and _number(play.get("touchdown")) and td_team in metrics:
                metrics[str(td_team)]["def_st_tds"] += 1
            # A score by the opposing defense happened while this D/ST's offense was
            # on the field. Remove only those points; the subsequent PAT still counts.
            if (
                offense in metrics
                and defense in metrics
                and td_team == defense
                and _number(play.get("touchdown"))
                and not is_special
            ):
                metrics[str(offense)]["points_allowed"] -= 6
            if offense in metrics and defense in metrics and _number(play.get("safety")):
                metrics[str(offense)]["points_allowed"] -= 2
        for team, team_metrics in metrics.items():
            points_allowed = max(0, int(team_metrics.pop("points_allowed")))
            bucket = (
                "points_allowed_0"
                if points_allowed == 0
                else "points_allowed_1_6"
                if points_allowed <= 6
                else "points_allowed_7_13"
                if points_allowed <= 13
                else "points_allowed_14_20"
                if points_allowed <= 20
                else "points_allowed_21_27"
                if points_allowed <= 27
                else "points_allowed_28_34"
                if points_allowed <= 34
                else "points_allowed_35p"
            )
            team_metrics[bucket] = 1.0
            results.append(
                {
                    **team_metrics,
                    "team": team,
                    "week": int(sample.get("week") or 0),
                    "game_id": sample.get("game_id"),
                    "points_allowed": points_allowed,
                }
            )
    return results


def build_special_team_player_rows(pbp_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    events: dict[tuple[str, int, str], dict[str, Any]] = {}
    for play in pbp_rows:
        if play.get("season_type") != "REG" or _number(play.get("special_teams_play")) != 1:
            continue
        game_id = str(play.get("game_id") or "")
        week = int(play.get("week") or 0)
        forced_by_players = {
            play.get("forced_fumble_player_1_player_id"),
            play.get("forced_fumble_player_2_player_id"),
        } - {None}
        recovered_by_players = {
            play.get("fumble_recovery_1_player_id"),
            play.get("fumble_recovery_2_player_id"),
        } - {None}
        for forced_by in forced_by_players:
            row = events.setdefault(
                (game_id, week, str(forced_by)),
                {"game_id": game_id, "week": week, "player_id": str(forced_by)},
            )
            row["st_fumbles_forced"] = _number(row.get("st_fumbles_forced")) + 1
        if _number(play.get("fumble_lost")):
            for recovered_by in recovered_by_players:
                row = events.setdefault(
                    (game_id, week, str(recovered_by)),
                    {"game_id": game_id, "week": week, "player_id": str(recovered_by)},
                )
                row["st_fumbles_recovered"] = (
                    _number(row.get("st_fumbles_recovered")) + 1
                )
    return list(events.values())


async def _load_defense_data(season: int) -> list[dict[str, Any]]:
    async with _data_lock:
        try:
            if season not in _defense_rows_by_season:
                columns = [
                    "game_id",
                    "season_type",
                    "week",
                    "posteam",
                    "defteam",
                    "play_type",
                    "desc",
                    "touchdown",
                    "td_team",
                    "special_teams_play",
                    "fumble",
                    "fumble_forced",
                    "fumble_lost",
                    "fumble_recovery_1_team",
                    "fumble_recovery_2_team",
                    "forced_fumble_player_1_team",
                    "forced_fumble_player_2_team",
                    "forced_fumble_player_1_player_id",
                    "forced_fumble_player_2_player_id",
                    "fumble_recovery_1_player_id",
                    "fumble_recovery_2_player_id",
                    "fourth_down_failed",
                    "sack",
                    "safety",
                    "interception",
                    "field_goal_result",
                    "extra_point_result",
                    "punt_blocked",
                    "total_home_score",
                    "total_away_score",
                    "home_team",
                    "away_team",
                ]
                # nflreadpy's generic downloader materializes the entire 100+ column
                # play-by-play file, keeps the downloaded bytes, and caches the full
                # frame before we can select the fields we need. That exceeds the
                # memory available to small production containers. Polars reads only
                # the selected Parquet columns and keeps the peak comfortably bounded.
                url = (
                    "https://github.com/nflverse/nflverse-data/releases/download/"
                    f"pbp/play_by_play_{season}.parquet"
                )
                frame = await asyncio.to_thread(pl.read_parquet, url, columns=columns)
                selected_rows = frame.to_dicts()
                _defense_rows_by_season[season] = build_defense_game_rows(selected_rows)
                _special_team_player_rows_by_season[season] = build_special_team_player_rows(
                    selected_rows
                )
        except Exception as exc:
            raise NflverseUnavailableError(
                "Public NFL defense data is temporarily unavailable"
            ) from exc
    return _defense_rows_by_season[season]


class LeagueScoringAuditService:
    def __init__(self, client: SleeperClient) -> None:
        self._client = client

    async def get_audit(
        self, league_id: str, season: int, week: int | None = None
    ) -> LeagueScoringAudit:
        league, rosters, members = await asyncio.gather(
            self._client.get_league(league_id),
            self._client.get_rosters(league_id),
            self._client.get_members(league_id),
        )
        id_map, all_stats = await _load_public_data(season)
        position_expansions = {
            "FLEX": {"RB", "WR", "TE"},
            "WRRB_FLEX": {"RB", "WR"},
            "REC_FLEX": {"WR", "TE"},
            "SUPER_FLEX": {"QB", "RB", "WR", "TE"},
        }
        eligible_positions = {
            position
            for slot in league.roster_positions
            for position in position_expansions.get(slot, {slot})
            if position in {"QB", "RB", "WR", "TE", "K", "DEF"}
        }
        scoring = {
            key: _number(value)
            for key, value in league.scoring_settings.items()
            if _number(value) != 0
        }
        supported = sorted(
            key
            for key in scoring
            if key in STAT_RULES or key in COMPOSITE_STAT_RULES or key in BONUS_RULES
        )
        unsupported = sorted(
            key
            for key in scoring
            if key not in STAT_RULES and key not in COMPOSITE_STAT_RULES and key not in BONUS_RULES
        )
        stats_by_player: dict[str, list[dict[str, Any]]] = {}
        for row in all_stats:
            if row.get("season_type") != "REG" or (week is not None and row.get("week") != week):
                continue
            stats_by_player.setdefault(str(row.get("player_id")), []).append(row)
        nflverse_to_sleeper_team = {"LA": "LAR"}
        defense_by_team: dict[str, list[dict[str, Any]]] = {}
        needs_play_by_play = "DEF" in eligible_positions or bool(
            {"st_ff", "st_fum_rec"}.intersection(scoring)
        )
        defense_rows = await _load_defense_data(season) if needs_play_by_play else []
        if "DEF" in eligible_positions:
            for row in defense_rows:
                if week is not None and row.get("week") != week:
                    continue
                nflverse_team = str(row.get("team") or "")
                sleeper_team = nflverse_to_sleeper_team.get(nflverse_team, nflverse_team)
                if sleeper_team:
                    defense_by_team.setdefault(sleeper_team, []).append(row)
            # nflverse supplies the detailed play data, while Sleeper remains the
            # authority for its own scorer-adjudicated D/ST categories. One cached
            # public read avoids trying to infer provider-specific judgments from text.
            sleeper_defense_stats = await self._client.get_defense_stats(season, week)
            adjudicated_columns = {
                "ff": "def_fumbles_forced",
                "fum_rec": "fumble_recovery_opp",
                "def_4_and_stop": "def_4_and_stops",
            }
            for team, rows in defense_by_team.items():
                official = sleeper_defense_stats.get(team)
                if not rows or official is None:
                    continue
                for scoring_key, column in adjudicated_columns.items():
                    if scoring_key not in official:
                        continue
                    current = sum(_number(row.get(column)) for row in rows)
                    rows[0][column] = _number(rows[0].get(column)) + (
                        _number(official[scoring_key]) - current
                    )
        if needs_play_by_play:
            for row in _special_team_player_rows_by_season.get(season, []):
                if week is not None and row.get("week") != week:
                    continue
                stats_by_player.setdefault(str(row["player_id"]), []).append(row)
        names = {member.user_id: member.display_name for member in members}
        player_ids = {player_id for roster in rosters for player_id in roster.players}
        ownership = {
            player_id: (
                roster.roster_id,
                names.get(roster.owner_id or "", f"Team {roster.roster_id}"),
            )
            for roster in rosters
            for player_id in roster.players
        }
        sleeper_id_by_gsis = {mapped[0]: sleeper_id for sleeper_id, mapped in id_map.items()}
        candidate_ids = set(player_ids)
        for gsis_id, rows in stats_by_player.items():
            if rows and str(rows[0].get("position") or "") in eligible_positions:
                sleeper_id = sleeper_id_by_gsis.get(gsis_id)
                if sleeper_id:
                    candidate_ids.add(sleeper_id)
        candidate_ids.update(defense_by_team)
        sleeper_players = await self._client.get_players(candidate_ids)
        results: list[PlayerScoringAudit] = []
        for player_id in candidate_ids:
            mapped = id_map.get(player_id)
            is_defense = player_id in defense_by_team
            gsis_id = f"team:{player_id}" if is_defense else mapped[0] if mapped else None
            rows = (
                defense_by_team[player_id] if is_defense else stats_by_player.get(gsis_id or "", [])
            )
            total, breakdown = calculate_breakdown(rows, scoring)
            games = len({str(row.get("game_id")) for row in rows if row.get("game_id")})
            sleeper_player = sleeper_players.get(player_id)
            player_name = (
                DEFENSE_NAMES.get(player_id)
                if is_defense
                else sleeper_player.full_name
                if sleeper_player and sleeper_player.full_name
                else mapped[1]
                if mapped
                else player_id
            )
            position = (
                sleeper_player.position
                if sleeper_player and sleeper_player.position
                else mapped[2]
                if mapped
                else None
            )
            roster_id, manager_name = ownership.get(player_id, (None, "Available"))
            results.append(
                PlayerScoringAudit(
                    sleeper_player_id=player_id,
                    nflverse_player_id=gsis_id,
                    player_name=player_name,
                    roster_id=roster_id,
                    manager_name=manager_name,
                    position=position,
                    avatar_url=(
                        f"https://sleepercdn.com/content/nfl/players/{player_id}.jpg"
                        if player_id.isdigit()
                        else None
                    ),
                    matched=is_defense or mapped is not None,
                    fantasy_points=total,
                    games=games,
                    statistics=aggregate_statistics(rows),
                    breakdown=breakdown,
                )
            )
        results.sort(key=lambda player: (-player.fantasy_points, player.player_name))
        assign_player_ranks(results)
        ranking_rows = await _load_ranking_rows()
        outlook_matches = attach_value_outlooks(
            results,
            ranking_rows,
            superflex="SUPER_FLEX" in league.roster_positions,
        )
        return LeagueScoringAudit(
            league_id=league_id,
            season=season,
            week=week,
            eligible_positions=[
                position
                for position in ("QB", "RB", "WR", "TE", "K", "DEF")
                if position in eligible_positions
            ],
            scoring_settings=scoring,
            supported_scoring_keys=supported,
            unsupported_scoring_keys=unsupported,
            total_players=len(results),
            matched_players=sum(player.matched for player in results),
            players_with_stats=sum(player.games > 0 for player in results),
            statistic_catalog=statistic_catalog(),
            outlook_status=(
                f"matched {outlook_matches} players"
                if ranking_rows
                else "FantasyPros rankings temporarily unavailable"
            ),
            players=results,
            source=SourceMetadata(
                provider="nflverse + sleeper", retrieved_at=datetime.now(timezone.utc)
            ),
        )
