from fastapi import APIRouter
from datetime import datetime
from src.core.scheduler import scheduler
from src.core.logger import get_logger
from src.discord_tools.sender import send_discord_message

logger = get_logger("tibialy.discord")
router = APIRouter(prefix="/discord", tags=["discord"])


@router.post("/schedule")
def schedule_message(message: str, trigger_time: datetime):
    scheduler.add_job(
        send_discord_message, "date", run_date=trigger_time, args=[message]
    )
    logger.info(
        "discord_message_scheduled",
        trigger_time=trigger_time.isoformat(),
        message_length=len(message),
    )
    return {"status": "Discord message scheduled"}
