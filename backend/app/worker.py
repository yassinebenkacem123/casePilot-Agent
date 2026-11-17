"""Durable polling worker with leases, bounded retries, and safe failure metadata."""

import argparse
import logging
import time
from datetime import timedelta

from sqlalchemy import or_, select

from app.agents.graph import run_analysis
from app.db.repository import TicketRepository
from app.db.session import SessionLocal
from app.models.entities import AnalysisJob, SyncOutbox, now
from app.services.sync import SyncService
from app.services.tickets import audit

logger = logging.getLogger("casepilot.worker")


def claim(factory, model):
    with factory.begin() as db:
        TicketRepository(db).lock_board()
        if model is AnalysisJob:
            query = select(model).where(
                or_(
                    (model.state == "PENDING") & (model.available_at <= now()),
                    (model.state == "RUNNING") & (model.lease_until < now()),
                )
            )
        else:
            query = select(model).where(
                or_(
                    (model.status.in_(["PENDING", "RETRY"])) & (model.available_at <= now()),
                    (model.status == "RUNNING") & (model.lease_until < now()),
                )
            )
        row = db.scalar(query.order_by(model.id).limit(1).with_for_update(skip_locked=True))
        if not row:
            return None
        if model is AnalysisJob:
            row.state = "RUNNING"
        else:
            row.status = "RUNNING"
        row.lease_until = now() + timedelta(seconds=120)
        return row.id


def process_analysis(factory, job_id):
    try:
        with factory.begin() as db:
            repo = TicketRepository(db)
            repo.lock_board()
            job = db.get(AnalysisJob, job_id)
            if not job or job.state != "RUNNING":
                return
            job.attempts += 1
            started = time.monotonic()
            run_analysis(db, job.ticket_id, job.id)
            if time.monotonic() - started > 35:
                raise TimeoutError("MODEL_TIMEOUT")
            job.state = "DONE"
            job.lease_until = None
            logger.info(
                "analysis_complete",
                extra={
                    "run_id": job.id,
                    "outcome": "DONE",
                    "duration_ms": round((time.monotonic() - started) * 1000),
                },
            )
    except Exception as error:
        # No exception message, response body, ticket content or credentials in logs.
        code = "MODEL_TIMEOUT" if isinstance(error, TimeoutError) else "ANALYSIS_FAILED"
        with factory.begin() as db:
            repo = TicketRepository(db)
            repo.lock_board()
            job = db.get(AnalysisJob, job_id)
            job.attempts += 1
            job.last_error = code
            job.state = "PENDING" if job.attempts < 2 else "FAILED"
            job.available_at = now() + timedelta(seconds=5)
            job.lease_until = None
            ticket = repo.get(job.ticket_id)
            ticket.analysis_state = (
                "PENDING_ANALYSIS" if job.state == "PENDING" else "MANUAL_REVIEW"
            )
            audit(
                db,
                ticket.id,
                "analysis.failed",
                after={"code": code, "retry_count": job.attempts, "outcome": job.state},
                actor="agent",
                run_id=job.id,
            )
        logger.warning("analysis_failed", extra={"run_id": job_id, "code": code})


def tick(factory=SessionLocal):
    job_id = claim(factory, AnalysisJob)
    if job_id:
        process_analysis(factory, job_id)
    outbox_id = claim(factory, SyncOutbox)
    if outbox_id:
        with factory.begin() as db:
            SyncService(db).process(outbox_id)
    return bool(job_id or outbox_id)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--once", action="store_true", help="Process one job and one sync, then exit"
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    if args.once:
        tick()
        return
    while True:
        try:
            if not tick():
                time.sleep(1)
        except KeyboardInterrupt:
            break
        except Exception:
            logger.error("worker_tick_failed")
            time.sleep(5)


if __name__ == "__main__":
    main()
