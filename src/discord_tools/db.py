import yaml
from pathlib import Path

DB_PATH = Path("database.yaml")


def load_db() -> dict:
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
