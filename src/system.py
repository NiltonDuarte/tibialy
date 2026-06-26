from dataclasses import dataclass
import urllib.request
import json
from typing import Dict, Union
from fastapi import APIRouter
from src.core.logger import get_logger
from src.config import __version__, GITHUB_REPO, APP_STATE

logger = get_logger("tibialy.update_check")
router = APIRouter(prefix="/api/system", tags=["System"])


@dataclass
class VolumePayload:
    volume: float


@router.post("/volume")
async def set_alarm_volume(payload: VolumePayload):
    # Ensure it stays within pyttsx3's required bounds
    APP_STATE["alarm_volume"] = max(0.0, min(1.0, payload.volume))
    return {"status": "success", "new_volume": APP_STATE["alarm_volume"]}


@router.get("/update-check")
def check_for_updates() -> Dict[str, Union[bool, str]]:
    if __version__ == "dev":
        logger.info("dev version")
        return {"update_available": False}

    try:
        url = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
        request = urllib.request.Request(url, headers={"User-Agent": "Tibialy-App"})

        with urllib.request.urlopen(request, timeout=3) as response:
            data = json.loads(response.read().decode())
            latest_tag = data.get("tag_name", "").lstrip("v")
            release_url = data.get("html_url", "")
            current_version = __version__.lstrip("v")
            update_available = latest_tag != current_version and latest_tag != ""
            logger.info(
                "lastest-version",
                latest_tag=latest_tag,
                update_available=update_available,
            )

            return {
                "update_available": update_available,
                "latest_version": latest_tag,
                "release_url": release_url,
            }
    except Exception as error:
        print(f"Update check failed: {error}")
        return {"update_available": False}
