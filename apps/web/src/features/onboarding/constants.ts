export const LEAGUE_SETUP_STEPS = [
  {
    title: "Select your league",
    detail: "Choose the league you want Fourth Down to prepare.",
  },
  {
    title: "Connecting to Sleeper",
    detail: "Opening a secure, read-only connection to the public league API.",
  },
  {
    title: "Loading rosters",
    detail: "Collecting managers, lineups, taxi squads, and draft capital.",
  },
  {
    title: "Matching player data",
    detail: "Linking every roster spot to current player profiles and images.",
  },
  {
    title: "Preparing player stats",
    detail: "Getting the scoring and statistics engine ready for this league.",
  },
  {
    title: "Building your dashboard",
    detail: "Organizing league history, standings, and activity into one view.",
  },
] as const;
