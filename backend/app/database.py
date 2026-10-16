import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import Config

connect_args = {"check_same_thread": False} if Config.DATABASE_URL.startswith("sqlite") else {"prepare_threshold": None}

engine = create_engine(
    Config.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args=connect_args,
    **({} if Config.DATABASE_URL.startswith("sqlite") else {"pool_size": 10, "max_overflow": 20})
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
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
