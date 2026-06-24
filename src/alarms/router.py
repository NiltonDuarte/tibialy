from fastapi import APIRouter
from datetime import datetime, timedelta
import pyttsx3
from src.core.scheduler import scheduler
from src.core.logger import get_logger

logger = get_logger("tibialy.alarms")
router = APIRouter(prefix="/alarms", tags=["alarms"])


def trigger_alarm(name: str):
    logger.info("alarm_triggered", alarm_name=name)

    try:
        # Initialize the TTS engine inside the thread to prevent OS-level COM/threading errors
        engine = pyttsx3.init()

        # Optional: Slow down the speaking rate slightly for clarity (default is usually ~200)
        engine.setProperty("rate", 160)

        # Construct the sentence you want it to speak
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
    )
    logger.info("alarm_set", alarm_name="Skill Potion", interval_minutes=10)
    return {"status": "Potion alarm set (10m)"}


@router.post("/plasma")
def start_plasma_alarm():
    scheduler.add_job(
        trigger_alarm,
        "interval",
        minutes=30,
        args=["Plasma Ring or Amulet"],  # Changed '/' to 'or' so it pronounces cleanly
        id="plasma_alarm",
        replace_existing=True,
    )
    logger.info("alarm_set", alarm_name="Plasma Ring/Amulet", interval_minutes=30)
    return {"status": "Plasma alarm set (30m)"}


@router.post("/custom")
def start_custom_alarm(name: str, minutes: int = None, trigger_time: datetime = None):
    if minutes:
        run_date = datetime.now() + timedelta(minutes=minutes)
        scheduler.add_job(trigger_alarm, "date", run_date=run_date, args=[name])
        logger.info(
            "custom_alarm_set",
            alarm_name=name,
            minutes_from_now=minutes,
            run_date=run_date.isoformat(),
        )
    elif trigger_time:
        scheduler.add_job(trigger_alarm, "date", run_date=trigger_time, args=[name])
        logger.info(
            "custom_alarm_set", alarm_name=name, trigger_time=trigger_time.isoformat()
        )
    return {"status": f"Custom alarm '{name}' scheduled"}
