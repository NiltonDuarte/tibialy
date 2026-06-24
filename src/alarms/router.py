from fastapi import APIRouter, HTTPException
from datetime import datetime
import pyttsx3
from src.core.scheduler import scheduler
from src.core.logger import get_logger

logger = get_logger("tibialy.alarms")
router = APIRouter(prefix="/alarms", tags=["alarms"])


def trigger_alarm(name: str):
    logger.info("alarm_triggered", alarm_name=name)
    try:
        engine = pyttsx3.init()
        engine.setProperty("rate", 160)
        announcement = f"Attention, {name}."
        engine.say(announcement)
        engine.runAndWait()
        logger.info("tts_played", text=announcement)
    except Exception as e:
        logger.error("tts_playback_error", error=str(e))


@router.post("/potion")
def start_potion_alarm():
    scheduler.add_job(
        trigger_alarm,
        "interval",
        minutes=10,
        args=["Skill Potion"],
        id="potion_alarm",
        replace_existing=True,
        misfire_grace_time=1,
    )
    logger.info("alarm_set", alarm_name="Skill Potion", interval_minutes=10)
    return {"status": "Potion alarm set (10m)"}


@router.post("/plasma")
def start_plasma_alarm():
    scheduler.add_job(
        trigger_alarm,
        "interval",
        minutes=30,
        args=["Plasma Ring or Amulet"],
        id="plasma_alarm",
        replace_existing=True,
        misfire_grace_time=1,
    )
    logger.info("alarm_set", alarm_name="Plasma Ring/Amulet", interval_minutes=30)
    return {"status": "Plasma alarm set (30m)"}


@router.post("/custom")
def start_custom_alarm(name: str, trigger_time: datetime):
    if trigger_time <= datetime.now():
        raise HTTPException(
            status_code=400, detail="Scheduled time must be in the future."
        )

    scheduler.add_job(
        trigger_alarm, "date", run_date=trigger_time, args=[name], misfire_grace_time=1
    )
    logger.info(
        "custom_alarm_set", alarm_name=name, trigger_time=trigger_time.isoformat()
    )

    return {"status": f"Custom alarm '{name}' scheduled"}
