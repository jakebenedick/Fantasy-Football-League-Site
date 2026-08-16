# Fantasy Co-Manager

Read-only Sleeper MVP foundation with Next.js and a typed FastAPI provider boundary.

## Implemented

- Username lookup, season league listing, league/roster/member import
- Cached Sleeper NFL player catalog with normalized names, positions, teams, status,
  injuries, eligibility, and player headshots (the upstream catalog is fetched at
  most once per day)
- Internal normalized league context and selected-roster identification
- Source timestamps, stable upstream error handling, and fixture-based tests
- Responsive frontend flow for username lookup, league selection, roster display,
  league-wide team browsing, league settings, refresh state, and
  mobile/tablet/desktop layouts
- On-demand dynasty context with manager avatars, reconstructed future draft-pick
  ownership, prior-season records, and head-to-head trade history
- Draft-status-aware pick inventory that removes a season's picks after its league
  draft is complete
- Clickable draft-pick provenance timelines reconstructed from completed trades
  across the dynasty league chain
- Separate starter, bench, taxi-squad, and injured-reserve roster groups
- Responsive team grid and season-switchable future draft-capital board
- League-history archive with per-season standings and playoff-bracket champions
- Collapsible season reports, direct column sorting, user-keyed finish charts, and
  on-demand player ownership timelines across drafts and transactions
- Repeatable Docker definitions

## Run locally

Requires Python 3.11+ and Node 20+.

```bash
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -e 'apps/api[dev]'
uvicorn app.main:app --app-dir apps/api --reload
```

Then run `npm install && npm run dev` in `apps/web`. API docs: `http://localhost:8000/docs`; web: `http://localhost:3000`. With Docker installed, use `docker compose up --build`.

Checks: `pytest apps/api/tests`, `ruff check apps/api`, `mypy apps/api/app`, and in `apps/web`, `npm run lint && npm run typecheck`.

## Deploy for league feedback

The repository includes a root `Dockerfile` and `render.yaml` for a single-service
Render deployment. Next.js is the only public process; its same-origin `/api/*`
rewrite forwards requests to FastAPI on the container's internal loopback interface.
No database or persistent filesystem is used.

1. Push this directory to its dedicated GitHub repository.
2. In Render, choose **New → Blueprint** and select the repository.
3. Review the `fourth-down` free web service and deploy it.
4. Share the generated `https://fourth-down-….onrender.com` URL.

The free service may sleep after 15 minutes without traffic and can take about a
minute to wake. Move to a paid instance or another production platform before
using the application for latency-sensitive workloads.

Only `.env.example` is committed. Local environment files, dependency folders,
build output, caches, and generated metadata are excluded by `.gitignore` and
`.dockerignore`.

## API

- `GET /health`
- `GET /api/v1/sleeper/users/{username}`
- `GET /api/v1/sleeper/users/{username}/leagues?season=2025`
- `GET /api/v1/sleeper/users/{username}/leagues/{league_id}`
- `GET /api/v1/sleeper/players/{player_id}`
- `GET /api/v1/sleeper/leagues/{league_id}/team-history/{owner_id}`
- `GET /api/v1/sleeper/leagues/{league_id}/pick-history`

## Decisions, risks, and next increment

The MVP is a modular monolith. Sleeper payloads are validated at the adapter boundary and normalized before exposure. Fetching is on demand; PostgreSQL is deferred until account state needs persistence. Docker definitions are present but Docker is unavailable on the current host.

Current gaps are authentication, persistent player caching, projections, and lineup construction. The current in-process player cache respects Sleeper's once-daily guidance but resets when the API process restarts; production should persist this catalog. Next, add a fixture-backed projection interface and deterministic standard/FLEX/SUPER_FLEX slot allocator. AI explanations should consume only that structured result and remain optional.
