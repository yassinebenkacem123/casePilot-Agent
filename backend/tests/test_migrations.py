import os
import subprocess
import sys
from pathlib import Path

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect, text

from app.db.session import Base


def test_migration_roundtrip_and_metadata(tmp_path):
    url = "sqlite:///" + (tmp_path / "migration.db").as_posix()
    env = os.environ | {"DATABASE_URL": url, "OPERATOR_TOKEN": "test-operator-token-for-tests"}
    cwd = Path(__file__).resolve().parents[1]

    def migrate(target):
        result = subprocess.run(
            [sys.executable, "-m", "alembic", *target],
            cwd=cwd,
            env=env,
            text=True,
            capture_output=True,
            timeout=45,
        )
        assert result.returncode == 0, result.stderr

    migrate(["upgrade", "head"])
    engine = create_engine(url)
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT count(*) FROM teams")) == 3
        assert connection.scalar(text("SELECT count(*) FROM boards")) == 1
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
    engine.dispose()
    migrate(["downgrade", "base"])
    engine = create_engine(url)
    assert "tickets" not in inspect(engine).get_table_names()
    engine.dispose()
    migrate(["upgrade", "head"])
