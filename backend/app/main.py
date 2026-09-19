from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import schemas  # noqa: F401 — asserts zero-collision at import
from app.config import settings
from app.database import SessionLocal, init_db
from app.routers import admin, analytics, assistant, complaints, hotspots, pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    from app.models import Ward
    with SessionLocal() as db:
        if not db.query(Ward).first():
            from app.seed.seed_indore_data import seed

            seed(db)
    yield


app = FastAPI(
    title="CivicPulse AI",
    description="Citizen → Feedback → AI → Pattern Detection → Hotspot → Priority Score → Government Action",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (complaints, pipeline, hotspots, analytics, assistant, admin):
    app.include_router(r.router, prefix="/api/v1")

app.mount("/media", StaticFiles(directory=str(settings.MEDIA_DIR)), name="media")


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "llm_mode": "gemini" if settings.llm_available else "fallback"}
