import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from .config import Config

engine = create_engine(
    Config.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    # SQLite does not support pool_size
    **({"connect_args": {"check_same_thread": False}} if Config.DATABASE_URL.startswith("sqlite") else {})
)

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
