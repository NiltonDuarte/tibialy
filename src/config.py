import sys
import os

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
