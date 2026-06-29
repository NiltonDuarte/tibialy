import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from src.alarms.router import router as alarms_router
from src.config import STATIC_PATH
from src.core.logger import get_logger
from src.core.scheduler import scheduler
from src.core.websocket import get_websocket_manager
from src.core.websocket import router as websocket_router
from src.discord_tools.router import router as discord_router
from src.jobs import router as jobs_router
from src.system import router as system_router
from src.ui import router as ui_router
from src.utilities.router import router as utilities_router

logger = get_logger("tibialy.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager = get_websocket_manager()
    manager.loop = asyncio.get_running_loop()
    logger.info("scheduler_starting")
    scheduler.start()
    yield
    logger.info("scheduler_shutting_down")
    scheduler.shutdown()


app = FastAPI(lifespan=lifespan, title="Tibialy")
app.mount("/static", StaticFiles(directory=STATIC_PATH), name="static")

app.include_router(ui_router)
app.include_router(jobs_router)
app.include_router(system_router)
app.include_router(websocket_router)
app.include_router(alarms_router)
app.include_router(discord_router)
app.include_router(utilities_router)
