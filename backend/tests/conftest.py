import os
import sys
import pytest
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Force in-memory database and test secret
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret-key-1234567890"
os.environ["FLASK_DEBUG"] = "false"

from app import create_app
from app.database import Base, engine, SessionLocal
from app.models import User, Project, Comment, Analysis
from app.auth import hash_password, create_access_token

@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        Base.metadata.create_all(bind=engine)
    yield app
    with app.app_context():
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(app):
    session = SessionLocal()
    yield session
    session.rollback()
    # Clean tables after each test
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()
    session.close()

@pytest.fixture
def client(app, db_session):
    return app.test_client()

@pytest.fixture
def test_user(db_session):
    user = User(email="testuser@example.com", password_hash=hash_password("Password123!"))
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_token(test_user):
    return create_access_token(test_user.id, test_user.email)

@pytest.fixture
def auth_headers(test_token):
    return {"Authorization": f"Bearer {test_token}"}
