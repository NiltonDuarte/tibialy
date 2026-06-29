from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from src.core.scheduler import scheduler
from src.core.logger import get_logger
from src.discord_tools.sender import send_discord_message
from src.discord_tools.db import load_db, save_db

logger = get_logger("tibialy.discord")
router = APIRouter(prefix="/discord", tags=["discord"])


# Define the expected JSON structures
class ScheduleRequest(BaseModel):
    character: str
    spot: str
    start_hour: str
    end_hour: str
    trigger_time: datetime
    booking_date: datetime
    message_count: int = 1


class ConfigModel(BaseModel):
    default_duration_hours: int
    characters: list[str]
    spots: list[str]


@router.get("/config")
def get_config():
    """Returns the current YAML database."""
    return load_db()


@router.put("/config")
def update_config(config: ConfigModel):
    """Overwrites the YAML database with new settings from the UI."""
    save_db(config.model_dump())
    return {"status": "Database settings updated"}


@router.post("/schedule")
def schedule_booking(req: ScheduleRequest):
    if req.trigger_time <= datetime.now():
        raise HTTPException(
            status_code=400, detail="Scheduled time must be in the future."
        )

    db = load_db()
    updated = False

    # Auto-add new characters or spots to the YAML file
    if req.character and req.character not in db["characters"]:
        db["characters"].append(req.character)
        updated = True
    if req.spot and req.spot not in db["spots"]:
        db["spots"].append(req.spot)
        updated = True

    if updated:
        save_db(db)

    # Construct the final template string
    message = f"/book character:{req.character} spot:{req.spot} date:{req.booking_date.strftime("%d.%m.%Y")} start:{req.start_hour} end:{req.end_hour}"

    early_run_date = req.trigger_time - timedelta(seconds=5)

    scheduler.add_job(
        send_discord_message,
        "date",
        run_date=early_run_date,
        args=[message, req.trigger_time, req.message_count],
        misfire_grace_time=10,
    )
    logger.info(
        "discord_booking_scheduled",
        message=message,
        message_count=req.message_count,
    )
    return {"status": "Discord booking scheduled"}
