from fastapi import APIRouter

from app.pipeline import trace

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.get("/{submission_id}")
def get_trace(submission_id: str):
    t = trace.get(submission_id)
    if not t:
        return {"submission_id": submission_id, "status": "unknown", "stages": [], "record": None}
    return t
