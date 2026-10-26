from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database import get_db

router = APIRouter(prefix="/health", tags=["System Health"])

@router.get("")
def health_check(db: Session = Depends(get_db)):
    """Verifies API server and database connectivity."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "service": "AK Cars API",
        "status": "online",
        "database": db_status
    }
