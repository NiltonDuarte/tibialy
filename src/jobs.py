from typing import Dict, List, Any
from fastapi import APIRouter, Depends
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from src.core.scheduler import scheduler as default_scheduler
from src.core.logger import get_logger

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

        func_name = job.func.__name__
        if func_name == "trigger_alarm":
            type_ = "Alarm"
            name = job.args[0] if job.args else "Unknown Alarm"
        elif func_name == "send_discord_message":
            type_ = "Discord"
            name = f"Msg: {job.args[0]}" if job.args else "Discord Message"
        else:
            type_ = "System"
            name = func_name

        jobs.append(
            {
                "id": job.id,
                "type": type_,
                "name": name,
                "next_run_time": job.next_run_time.isoformat(),
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
