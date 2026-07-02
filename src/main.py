import multiprocessing
import os
import sys

# ==========================================
# MACOS THREAD FREEZE PATCH
# ==========================================
if sys.platform == "darwin":
    # Force multiprocessing to use spawn (avoids fork-related Cocoa deadlocks)
    multiprocessing.set_start_method("spawn", force=True)


# 1. Provide multiprocessing support for PyInstaller executables
if sys.platform.startswith("win"):
    multiprocessing.freeze_support()

# 2. Safely mock all standard streams for Uvicorn in windowed mode
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")
if sys.stdin is None:
    sys.stdin = open(os.devnull, "r")

from src.core.logger import get_logger, setup_logging
from src.desktop_launcher import start_desktop_app

if __name__ == "__main__":
    setup_logging()
    logger = get_logger("tibialy.main")
    logger.info("""


********
Starting Tibialy
********
""")
    start_desktop_app()
