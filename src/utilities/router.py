from typing import Any, Dict

from fastapi import APIRouter

from src.utilities.db import load_records, save_records

router = APIRouter(prefix="/api/utilities", tags=["Utilities"])


@router.get("/records")
def get_records() -> Dict[str, Any]:
    return load_records()


@router.post("/records")
def add_record(session: Dict[str, Any]) -> Dict[str, str]:
    db = load_records()
    if "sessions" not in db:
        db["sessions"] = []
    db["sessions"].append(session)
    save_records(db)
    return {"status": "success"}


@router.delete("/records/{record_date}")
def delete_single_record(record_date: str) -> Dict[str, str]:
    db = load_records()
    if "sessions" in db:
        db["sessions"] = [s for s in db["sessions"] if s.get("date") != record_date]
        save_records(db)
    return {"status": "success"}


@router.delete("/records")
def clear_records() -> Dict[str, str]:
    save_records({"sessions": []})
    return {"status": "success"}
