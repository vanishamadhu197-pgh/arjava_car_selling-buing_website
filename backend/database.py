from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

# Handle connection args according to dialect
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True
    )
except Exception as e:
    logger.warning(f"Could not connect to configured DATABASE_URL ({settings.DATABASE_URL}). Falling back to local SQLite: {e}")
    engine = create_engine("sqlite:///./ak_cars.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency injection to provide a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
