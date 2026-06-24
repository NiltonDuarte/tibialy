from fastapi import APIRouter, HTTPException
from datetime import datetime
from src.core.scheduler import scheduler
from src.core.logger import get_logger
from src.discord_tools.sender import send_discord_message

logger = get_logger("tibialy.discord")
router = APIRouter(prefix="/discord", tags=["discord"])


@router.post("/schedule")
def schedule_message(message: str, trigger_time: datetime):
    # Backend check: Ensure the time is in the future
    if trigger_time <= datetime.now():
        logger.warning(
            "scheduling_failed",
            reason="time_in_past",
            trigger_time=trigger_time.isoformat(),
        )
        raise HTTPException(
            status_code=400, detail="Scheduled time must be in the future."
        )

    scheduler.add_job(
        send_discord_message, "date", run_date=trigger_time, args=[message]
    )
    logger.info(
        "discord_message_scheduled",
        trigger_time=trigger_time.isoformat(),
        message_length=len(message),
    )
    return {"status": "Discord message scheduled"}
