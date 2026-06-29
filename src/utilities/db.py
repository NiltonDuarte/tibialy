import json
import os
import sys
from pathlib import Path
from typing import Any, Dict

from src.core.helpers import get_app_data_dir


def get_records_path() -> Path:
    app_data_dir = get_app_data_dir()
    persistent_path = app_data_dir / "records.json"

    if not persistent_path.exists():
        persistent_path.touch()
        with open(persistent_path, "w", encoding="utf-8") as f:
            json.dump({"sessions": []}, f)

    return persistent_path


def load_records(records_path=get_records_path()) -> Dict[str, Any]:
    try:
        if records_path.exists() and records_path.stat().st_size > 0:
            with open(records_path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {"sessions": []}


def save_records(data: Dict[str, Any], records_path=get_records_path()) -> None:
    with open(records_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
