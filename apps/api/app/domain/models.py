from datetime import datetime
from pydantic import BaseModel, Field


class SourceMetadata(BaseModel):
    provider: str = "sleeper"
    retrieved_at: datetime


class User(BaseModel):
    user_id: str
    username: str
    display_name: str
    avatar: str | None = None


class LeagueSummary(BaseModel):
    league_id: str
    name: str
    season: str
    status: str
    total_rosters: int
    roster_positions: list[str]
    taxi_slots: int = 0
    avatar_url: str | None = None


class FantasyRoster(BaseModel):
    roster_id: int
    owner_id: str | None
    owner_display_name: str | None = None
    team_name: str | None = None
    owner_avatar_url: str | None = None
    players: list[str] = Field(default_factory=list)
    starters: list[str] = Field(default_factory=list)
    taxi: list[str] = Field(default_factory=list)
    reserve: list[str] = Field(default_factory=list)
    settings: dict[str, int | float | None] = Field(default_factory=dict)
    draft_picks: list["DraftPick"] = Field(default_factory=list)


class DraftPick(BaseModel):
    season: str
    round: int
    original_roster_id: int
    original_owner_name: str | None = None
    pick_number: int | None = None
    acquired: bool = False


class SeasonRecord(BaseModel):
    season: str
    wins: int = 0
    losses: int = 0
    ties: int = 0
    points: float = 0
    champion: bool = False


class LeagueHistoryTeam(BaseModel):
    roster_id: int
    owner_id: str | None
    manager_name: str
    team_name: str | None = None
    wins: int = 0
    losses: int = 0
    ties: int = 0
    points: float = 0
    champion: bool = False
    finish_position: int | None = None
    avatar_url: str | None = None


class LeagueHistoryBracketMatch(BaseModel):
    round: int
    match_id: int
    team_1_roster_id: int | None = None
    team_2_roster_id: int | None = None
    winner_roster_id: int | None = None
    loser_roster_id: int | None = None
    placement: int | None = None


class LeagueHistorySeason(BaseModel):
    league_id: str
    season: str
    teams: list[LeagueHistoryTeam] = Field(default_factory=list)
    bracket: list[LeagueHistoryBracketMatch] = Field(default_factory=list)


class LeagueHistory(BaseModel):
    seasons: list[LeagueHistorySeason] = Field(default_factory=list)


class LeagueActivityTeam(BaseModel):
    owner_id: str
    manager_name: str
    avatar_url: str | None = None
    transactions: int = 0
    trades: int = 0


class LeagueActivityTradeSide(BaseModel):
    manager_name: str
    assets_received: list[str] = Field(default_factory=list)


class LeagueActivityTrade(BaseModel):
    transaction_id: str
    season: str
    created_at: datetime
    sides: list[LeagueActivityTradeSide] = Field(default_factory=list)


class LeagueTradePair(BaseModel):
    owner_ids: list[str] = Field(default_factory=list)
    manager_names: list[str] = Field(default_factory=list)
    trades: int = 0
    trade_history: list[LeagueActivityTrade] = Field(default_factory=list)


class LeagueActivity(BaseModel):
    teams: list[LeagueActivityTeam] = Field(default_factory=list)
    trade_pairs: list[LeagueTradePair] = Field(default_factory=list)
    seasons_scanned: list[str] = Field(default_factory=list)


class TradeSide(BaseModel):
    roster_id: int
    manager_name: str
    player_ids_received: list[str] = Field(default_factory=list)
    draft_picks_received: list[DraftPick] = Field(default_factory=list)


class TradeSummary(BaseModel):
    transaction_id: str
    season: str
    created_at: datetime
    sides: list[TradeSide] = Field(default_factory=list)


class TeamHistory(BaseModel):
    roster_id: int
    owner_id: str | None
    seasons: list[SeasonRecord] = Field(default_factory=list)
    trades_with_selected_user: list[TradeSummary] = Field(default_factory=list)
    player_names: dict[str, str] = Field(default_factory=dict)


class PickTransfer(BaseModel):
    transaction_id: str
    league_season: str
    created_at: datetime
    from_roster_id: int
    from_manager_name: str
    to_roster_id: int
    to_manager_name: str
    trade_sides: list[TradeSide] = Field(default_factory=list)


class PickHistory(BaseModel):
    pick: DraftPick
    current_owner_id: int
    current_owner_name: str
    transfers: list[PickTransfer] = Field(default_factory=list)
    player_names: dict[str, str] = Field(default_factory=dict)


class PlayerMovementSide(BaseModel):
    roster_id: int
    manager_name: str
    assets_received: list[str] = Field(default_factory=list)


class PlayerMovement(BaseModel):
    event_type: str
    league_season: str
    occurred_at: datetime | None = None
    from_manager_name: str | None = None
    to_manager_name: str | None = None
    description: str
    transaction_id: str | None = None
    details: list[str] = Field(default_factory=list)
    sides: list[PlayerMovementSide] = Field(default_factory=list)


class PlayerHistory(BaseModel):
    player_id: str
    player_name: str
    events: list[PlayerMovement] = Field(default_factory=list)


class Player(BaseModel):
    player_id: str
    full_name: str
    first_name: str | None = None
    last_name: str | None = None
    nfl_team: str | None = None
    position: str | None = None
    eligible_positions: list[str] = Field(default_factory=list)
    status: str | None = None
    injury_status: str | None = None
    number: int | None = None
    age: int | None = None
    avatar_url: str | None = None
    is_og: bool = False
    og_drafted_season: str | None = None
    og_pick_number: int | None = None


class ScoringBreakdownItem(BaseModel):
    scoring_key: str
    label: str
    statistic: float
    multiplier: float
    points: float


class StatisticDefinition(BaseModel):
    key: str
    label: str
    category: str
    positions: list[str] = Field(default_factory=list)
    format: str = "number"


class PlayerValueOutlook(BaseModel):
    source: str
    ranking_format: str
    effective_at: str | None = None
    ecr: float
    position_rank: int | None = None
    tier: int | None = None
    best_rank: float | None = None
    worst_rank: float | None = None
    rank_standard_deviation: float | None = None
    rank_delta: float | None = None


class PlayerScoringAudit(BaseModel):
    sleeper_player_id: str
    nflverse_player_id: str | None = None
    player_name: str
    roster_id: int | None = None
    manager_name: str
    position: str | None = None
    avatar_url: str | None = None
    matched: bool = False
    fantasy_points: float = 0
    games: int = 0
    overall_rank: int | None = None
    position_rank: int | None = None
    statistics: dict[str, float] = Field(default_factory=dict)
    value_outlook: PlayerValueOutlook | None = None
    breakdown: list[ScoringBreakdownItem] = Field(default_factory=list)


class LeagueScoringAudit(BaseModel):
    league_id: str
    season: int
    week: int | None = None
    eligible_positions: list[str] = Field(default_factory=list)
    scoring_settings: dict[str, float] = Field(default_factory=dict)
    supported_scoring_keys: list[str] = Field(default_factory=list)
    unsupported_scoring_keys: list[str] = Field(default_factory=list)
    total_players: int = 0
    matched_players: int = 0
    players_with_stats: int = 0
    statistic_catalog: list[StatisticDefinition] = Field(default_factory=list)
    outlook_status: str = "unavailable"
    players: list[PlayerScoringAudit] = Field(default_factory=list)
    source: SourceMetadata


class LeagueContext(BaseModel):
    league: LeagueSummary
    selected_user: User
    selected_roster: FantasyRoster | None
    rosters: list[FantasyRoster]
    players: dict[str, Player] = Field(default_factory=dict)
    source: SourceMetadata
