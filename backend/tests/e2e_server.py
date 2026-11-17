"""Isolated browser-test server. Never use this in deployment."""
import os
import sys
import threading
import time
from pathlib import Path

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "backend"))
database = root / ".cache" / "e2e.db"
database.parent.mkdir(exist_ok=True)
# Only this explicitly named disposable test database is replaced.
for suffix in ("", "-wal", "-shm"):
    Path(str(database) + suffix).unlink(missing_ok=True)
os.environ["DATABASE_URL"] = "sqlite:///" + database.as_posix()
os.environ["OPERATOR_TOKEN"] = "e2e-operator-token-for-local-tests"
os.environ["DEMO_MODE"] = "true"
os.environ["SALESFORCE_MODE"] = "demo"
os.environ["LLM_MODEL"] = ""
os.environ["OPENAI_API_KEY"] = ""
os.environ["FRONTEND_ORIGIN"] = "http://127.0.0.1:3100"
os.chdir(root / "backend")

import uvicorn  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402

from app.seed import seed  # noqa: E402
from app.worker import tick  # noqa: E402

command.upgrade(Config("alembic.ini"), "head")
seed()


def work():
    while True:
        tick()
        time.sleep(0.15)


threading.Thread(target=work, daemon=True).start()
uvicorn.run("app.main:app", host="127.0.0.1", port=8100, access_log=False)
