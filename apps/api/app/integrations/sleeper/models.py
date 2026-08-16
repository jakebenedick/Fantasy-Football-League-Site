from pydantic import BaseModel, ConfigDict, Field


class SleeperModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


class SleeperUser(SleeperModel):
    user_id: str
    username: str
    display_name: str
    avatar: str | None = None


class SleeperLeague(SleeperModel):
    league_id: str
    name: str
    season: str
    status: str
    total_rosters: int
    roster_positions: list[str] = Field(default_factory=list)
    previous_league_id: str | None = None
    settings: dict[str, int | float | str | None] = Field(default_factory=dict)
    scoring_settings: dict[str, int | float | None] = Field(default_factory=dict)
    avatar: str | None = None


class SleeperRoster(SleeperModel):
    roster_id: int
    owner_id: str | None = None
    players: list[str] = Field(default_factory=list)
    starters: list[str] = Field(default_factory=list)
    taxi: list[str] | None = None
    reserve: list[str] | None = None
    settings: dict[str, int | float | None] = Field(default_factory=dict)


class SleeperLeagueMember(SleeperModel):
    user_id: str
    display_name: str
    avatar: str | None = None
    metadata: dict[str, str | None] = Field(default_factory=dict)


class SleeperTradedPick(SleeperModel):
    season: str
    round: int
    roster_id: int
    previous_owner_id: int
    owner_id: int


class SleeperTransaction(SleeperModel):
    type: str
    transaction_id: str
    status: str
    roster_ids: list[int] = Field(default_factory=list)
    adds: dict[str, int] | None = None
    drops: dict[str, int] | None = None
    draft_picks: list[SleeperTradedPick] = Field(default_factory=list)
    created: int
    leg: int | None = None


class SleeperDraft(SleeperModel):
    draft_id: str
    league_id: str | None = None
    season: str
    status: str
    type: str | None = None
    start_time: int | None = None
    slot_to_roster_id: dict[str, int] | None = None
    draft_order: dict[str, int] | None = None


class SleeperDraftPick(SleeperModel):
    player_id: str
    roster_id: int
    round: int
    pick_no: int
    draft_id: str
    draft_slot: int | None = None


class SleeperBracketMatch(SleeperModel):
    r: int
    m: int
    w: int | None = None
    loser: int | None = Field(default=None, validation_alias="l")
    p: int | None = None
    t1: int | None = None
    t2: int | None = None


class SleeperPlayer(SleeperModel):
    player_id: str
    first_name: str | None = None
    last_name: str | None = None
    full_name: str | None = None
    team: str | None = None
    position: str | None = None
    fantasy_positions: list[str] | None = None
    status: str | None = None
    injury_status: str | None = None
    number: int | str | None = None
    age: int | str | None = None
