from typing import Any, Dict, List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import APIRouter, Depends

from src.core.logger import get_logger
from src.core.scheduler import JobType
from src.core.scheduler import scheduler as default_scheduler

logger = get_logger("tibialy.jobs")
router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


def get_scheduler() -> AsyncIOScheduler:
    return default_scheduler


@router.get("")
def get_active_jobs(
    scheduler: AsyncIOScheduler = Depends(get_scheduler),
) -> Dict[str, List[Dict[str, Any]]]:
    jobs = []
    for job in scheduler.get_jobs():
        if not job.next_run_time:
            continue

        display_time = job.next_run_time
        job_type = job.name  # Now contains our Enum string

        # Fallback for untagged background tasks
        if job_type not in [e.value for e in JobType]:
            job_type = JobType.SYSTEM.value

        # Build the descriptive name based on the known type
        if job_type == JobType.ALARM.value:
            name = job.args[0] if job.args else "Unknown Alarm"

        elif job_type == JobType.DISCORD.value:
            name = f"Msg: {job.args[0]}" if job.args else "Discord Message"
            if len(job.args) > 1:
                display_time = job.args[1]

        else:
            name = job.func.__name__

        jobs.append(
            {
                "id": job.id,
                "type": job_type,
                "name": name,
                "next_run_time": display_time.isoformat(),
            }
        )

    jobs.sort(key=lambda x: x["next_run_time"])
    return {"jobs": jobs}


@router.delete("/{job_id}")
def cancel_job(
    job_id: str, scheduler: AsyncIOScheduler = Depends(get_scheduler)
) -> Dict[str, str]:
    try:
        scheduler.remove_job(job_id)
        logger.info("job_cancelled", job_id=job_id)
        return {"status": "Job cancelled"}
    except Exception as error:
        logger.warning("job_cancel_failed", job_id=job_id, error=str(error))
        return {"status": "Job not found or already executed"}
