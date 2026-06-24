import asyncio
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager

from src.core.scheduler import scheduler
from src.core.logger import get_logger
from src.core.websocket import router as websocket_router, manager
from src.alarms.router import router as alarms_router
from src.discord_tools.router import router as discord_router

logger = get_logger("tibialy.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager.loop = asyncio.get_running_loop()
    logger.info("scheduler_starting")
    scheduler.start()
    yield
    logger.info("scheduler_shutting_down")
    scheduler.shutdown()


app = FastAPI(lifespan=lifespan, title="Tibialy")

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


@app.get("/", tags=["UI"])
def serve_dashboard(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


# --- NEW JOBS ENDPOINT ---
@app.get("/api/jobs", tags=["Jobs"])
def get_active_jobs():
    jobs = []
    for job in scheduler.get_jobs():
        if not job.next_run_time:
            continue

        # Determine the type and name based on the function scheduled
        func_name = job.func.__name__
        if func_name == "trigger_alarm":
            type_ = "Alarm"
            name = job.args[0] if job.args else "Unknown Alarm"
        elif func_name == "send_discord_message":
            type_ = "Discord"
            name = f"Msg: {job.args[0]}" if job.args else "Discord Message"
        else:
            type_ = "System"
            name = func_name

        jobs.append(
            {
                "id": job.id,
                "type": type_,
                "name": name,
                "next_run_time": job.next_run_time.isoformat(),
            }
        )

    # Sort so the closest timers appear first
    jobs.sort(key=lambda x: x["next_run_time"])
    return {"jobs": jobs}


@app.delete("/api/jobs/{job_id}", tags=["Jobs"])
def cancel_job(job_id: str):
    try:
        scheduler.remove_job(job_id)
        logger.info("job_cancelled", job_id=job_id)
        return {"status": "Job cancelled"}
    except Exception as e:
        logger.warning("job_cancel_failed", job_id=job_id, error=str(e))
        return {"status": "Job not found or already executed"}


app.include_router(websocket_router)
app.include_router(alarms_router)
app.include_router(discord_router)
