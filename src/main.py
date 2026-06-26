import sys
import os

# Intercept None streams for PyInstaller windowed mode
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

from src.desktop_launcher import start_desktop_app

if __name__ == "__main__":
    start_desktop_app()
