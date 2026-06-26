import os
import sys
import shutil
import yaml
from pathlib import Path


def get_db_path() -> Path:
    print(f"🔍 DEBUG: sys.platform = {sys.platform}")
    print(f"🔍 DEBUG: is frozen? = {getattr(sys, 'frozen', False)}")

    if sys.platform == "win32":
        app_data_dir = Path(os.environ.get("APPDATA", "~")).expanduser() / "Tibialy"
    elif sys.platform == "darwin":
        app_data_dir = Path.home() / "Library" / "Application Support" / "Tibialy"
    else:
        app_data_dir = Path.home() / ".tibialy"

    app_data_dir.mkdir(parents=True, exist_ok=True)
    persistent_db_path = app_data_dir / "database.yaml"
    print(f"🔍 DEBUG: Target persistent_db_path = {persistent_db_path}")

    if not persistent_db_path.exists():
        if getattr(sys, "frozen", False):
            base_path = Path(sys._MEIPASS)
            print(f"🔍 DEBUG: sys._MEIPASS = {base_path}")
            bundled_db_path = base_path / "database.yaml"
            print(
                f"🔍 DEBUG: Checking bundled_db_path (default MEIPASS) = {bundled_db_path} | Exists: {bundled_db_path.exists()}"
            )

            # MACOS APP BUNDLE FIX
            if not bundled_db_path.exists() and sys.platform == "darwin":
                print(
                    "🔍 DEBUG: Not found in MEIPASS. macOS detected. Checking Resources folder..."
                )
                print(f"🔍 DEBUG: sys.executable = {sys.executable}")
                bundled_db_path = (
                    Path(sys.executable).parent.parent / "Resources" / "database.yaml"
                )
                print(
                    f"🔍 DEBUG: Checking bundled_db_path (macOS Resources) = {bundled_db_path} | Exists: {bundled_db_path.exists()}"
                )

        else:
            base_path = Path(__file__).resolve().parent.parent.parent
            print(f"🔍 DEBUG: Running from source. base_path = {base_path}")
            bundled_db_path = base_path / "database.yaml"
            print(
                f"🔍 DEBUG: Checking bundled_db_path (source) = {bundled_db_path} | Exists: {bundled_db_path.exists()}"
            )

        if bundled_db_path.exists():
            shutil.copy(bundled_db_path, persistent_db_path)
            print(
                f"📦 Bundled database.yaml copied from {bundled_db_path} to persistent storage."
            )
        else:
            persistent_db_path.touch()
            print(f"📝 Created a brand new empty database.yaml at {persistent_db_path}")
            print(
                "❌ ERROR: Could not find the bundled file! Look at the paths checked above to see where it looked."
            )

    else:
        print(f"✅ Persistent database already exists at {persistent_db_path}")

    return persistent_db_path


# Initialize the safe path immediately
DB_PATH = get_db_path()


def load_db() -> dict:
    data = {}

    # Read the file if it has content
    if DB_PATH.exists() and DB_PATH.stat().st_size > 0:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

    # Ensure all keys exist to prevent errors if the user manually wiped the file
    data.setdefault("default_duration_hours", 2)
    data.setdefault("characters", [])
    data.setdefault("spots", [])

    return data


def save_db(data: dict):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
