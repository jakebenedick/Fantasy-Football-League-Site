import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import router

app = FastAPI(title="Fantasy Co-Manager API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


static_dir_value = os.environ.get("STATIC_DIR")
static_dir = Path(static_dir_value) if static_dir_value else None
if static_dir is not None and static_dir.is_dir():
    # Registered last so API, health, and docs routes always win. In production
    # FastAPI serves the exported Next.js application without a second runtime.
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="web")
