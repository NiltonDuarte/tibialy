from enum import StrEnum

from apscheduler.schedulers.asyncio import AsyncIOScheduler


class JobType(StrEnum):
    DISCORD = "Discord"
    ALARM = "Alarm"
    SYSTEM = "System"


scheduler = AsyncIOScheduler()


def get_scheduler() -> AsyncIOScheduler:
    return scheduler
