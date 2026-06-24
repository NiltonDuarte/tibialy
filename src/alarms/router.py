from fastapi import APIRouter
from datetime import datetime, timedelta
import os
import pygame
from src.core.scheduler import scheduler
from src.core.logger import get_logger

logger = get_logger("tibialy.alarms")
router = APIRouter(prefix="/alarms", tags=["alarms"])

pygame.mixer.init()


def trigger_alarm(name: str):
    logger.info("alarm_triggered", alarm_name=name)

    sound_file = "static/alarm.mp3"

    if os.path.exists(sound_file):
        try:
            pygame.mixer.music.load(sound_file)
            pygame.mixer.music.play()
            logger.info("audio_played", file=sound_file)
        except Exception as e:
            logger.error("audio_playback_error", error=str(e), file=sound_file)
    else:
        logger.warning("audio_file_not_found", file=sound_file)


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
        args=["Plasma Ring/Amulet"],
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
