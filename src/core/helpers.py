import os
import sys
from pathlib import Path


def get_app_data_dir() -> Path:
    if sys.platform == "win32":
        app_data_dir = Path(os.environ.get("APPDATA", "~")).expanduser() / "Tibialy"
    elif sys.platform == "darwin":
        app_data_dir = Path.home() / "Library" / "Application Support" / "Tibialy"
    else:
        app_data_dir = Path.home() / ".tibialy"
    app_data_dir.mkdir(parents=True, exist_ok=True)
    return app_data_dir
