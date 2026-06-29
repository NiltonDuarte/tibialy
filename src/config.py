import os
import sys

try:
    from _version import __version__
except ImportError:
    __version__ = "dev"

if getattr(sys, "frozen", False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STATIC_PATH = os.path.join(BASE_DIR, "static")
TEMPLATES_PATH = os.path.join(BASE_DIR, "templates")
GITHUB_REPO = "NiltonDuarte/tibialy"
DISCORD_MESSAGE_PREPARATION_SECONDS = 3

APP_STATE = {"alarm_volume": 1.0}
