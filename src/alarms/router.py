from fastapi import APIRouter, HTTPException
from datetime import datetime
import pyttsx3
from src.config import APP_STATE
from src.core.scheduler import scheduler
from src.core.logger import get_logger

logger = get_logger("tibialy.alarms")
router = APIRouter(prefix="/alarms", tags=["alarms"])


def trigger_alarm(name: str):
    logger.info("alarm_triggered", alarm_name=name)
    try:
        engine = pyttsx3.init()
        engine.setProperty("rate", 160)
        current_volume = APP_STATE.get("alarm_volume", 1.0)
        engine.setProperty("volume", current_volume)
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


@router.post("/plasma_ring")
def start_plasma_ring_alarm():
    scheduler.add_job(
        trigger_alarm,
        "interval",
        minutes=30,
        args=["Plasma Ring"],
        id="plasma_ring_alarm",
        replace_existing=True,
        misfire_grace_time=1,
    )
    logger.info("alarm_set", alarm_name="Plasma Ring", interval_minutes=30)
    return {"status": "Plasma Ring alarm set (30m)"}


@router.post("/plasma_amulet")
def start_plasma_amulet_alarm():
    scheduler.add_job(
        trigger_alarm,
        "interval",
        minutes=30,
        args=["Plasma Amulet"],
        id="plasma_amulet_alarm",
        replace_existing=True,
        misfire_grace_time=1,
    )
    logger.info("alarm_set", alarm_name="Plasma Amulet", interval_minutes=30)
    return {"status": "Plasma Amulet alarm set (30m)"}


@router.post("/prismatic_ring")
def start_prismatic_ring_alarm():
    scheduler.add_job(
        trigger_alarm,
        "interval",
        minutes=60,
        args=["Prismatic Ring"],
        id="prismatic_ring_alarm",
        replace_existing=True,
        misfire_grace_time=1,
    )
    logger.info("alarm_set", alarm_name="Prismatic Ring", interval_minutes=60)
    return {"status": "Prismatic Ring alarm set (1h)"}


# --- SPLIT CUSTOM ALARM ENDPOINTS ---


@router.post("/custom/recurring")
def create_recurring_alarm(name: str, interval_seconds: int):
    """Creates an alarm that fires repeatedly at a set interval."""
    job_id = f"custom_{name.replace(' ', '_').lower()}"
    scheduler.add_job(
        trigger_alarm,
        "interval",
        seconds=interval_seconds,
        args=[name],
        id=job_id,
        replace_existing=True,
        misfire_grace_time=1,
    )
    logger.info(
        "custom_alarm_set_recurring", alarm_name=name, interval_seconds=interval_seconds
    )
    return {"status": f"Recurring custom alarm '{name}' scheduled"}


@router.post("/custom/once")
def create_one_off_alarm(name: str, trigger_time: datetime):
    """Creates a single-use alarm that fires at an exact future date/time."""
    if trigger_time <= datetime.now():
        raise HTTPException(
            status_code=400, detail="Scheduled time must be in the future."
        )

    scheduler.add_job(
        trigger_alarm, "date", run_date=trigger_time, args=[name], misfire_grace_time=1
    )
    logger.info(
        "custom_alarm_set_once", alarm_name=name, trigger_time=trigger_time.isoformat()
    )
    return {"status": f"Custom one-off alarm '{name}' scheduled"}
