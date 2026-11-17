import os

os.environ["OPERATOR_TOKEN"] = "test-operator-token-for-tests"
os.environ["DATABASE_URL"] = "sqlite://"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db.session import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.entities import Board, Team  # noqa: E402


@pytest.fixture
def database():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    with factory() as db:
        db.add(Board(id=1))
        for team in ("technical", "billing", "general"):
            db.add(Team(id=team, name=team, categories=[]))
        db.commit()
    yield factory
    engine.dispose()


@pytest.fixture
def client(database):
    def override():
        with database() as session:
            try:
                yield session
                session.commit()
            except Exception:
                session.rollback()
                raise

    app.dependency_overrides[get_db] = override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def auth():
    return {"Authorization": "Bearer test-operator-token-for-tests"}


@pytest.fixture
def submission():
    return {
        "name": "Demo Customer",
        "email": "demo@example.com",
        "subject": "Need support",
        "description": "Please help with my account settings.",
    }
