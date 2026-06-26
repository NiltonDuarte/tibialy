import sys
import os
import multiprocessing

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

from src.desktop_launcher import start_desktop_app

if __name__ == "__main__":
    start_desktop_app()
