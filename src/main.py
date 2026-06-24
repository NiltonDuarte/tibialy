import asyncio
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from src.core.scheduler import scheduler
from src.core.logger import setup_logging, get_logger
from src.core.ws import router as ws_router, manager
from src.alarms.router import router as alarms_router
from src.discord_tools.router import router as discord_router

setup_logging()
logger = get_logger("tibialy.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Capture the main asyncio loop for thread-safe logging
    manager.loop = asyncio.get_running_loop()
    
    logger.info("scheduler_starting")
    scheduler.start()
    yield
    logger.info("scheduler_shutting_down")
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan, title="Tibialy")

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", tags=["UI"])
def serve_dashboard() -> FileResponse:
    return FileResponse("static/index.html")

app.include_router(ws_router)
app.include_router(alarms_router)
app.include_router(discord_router)