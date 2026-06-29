import asyncio
import sys
import time
from datetime import datetime

import pyautogui
import pyperclip

from src.core.logger import get_logger

logger = get_logger("tibialy.discord_tools.sender")


def _send_sync(message: str, target_timestamp: float):
    logger.info("botting sync send", message=message, target_timestamp=target_timestamp)
    # 1. Copy payload immediately to ensure OS clipboard is synced
    pyperclip.copy(message)
    modifier = "command" if sys.platform == "darwin" else "ctrl"

    # 3. Press modifier key down early
    pyautogui.keyDown(modifier)
    time.sleep(0.25)
    # 5. Paste exactly on target timestamp and clean up
    pyautogui.press("v")
    time.sleep(0.25)
    pyautogui.keyUp(modifier)
    logger.info("message pasted, waiting millisecond precision")
    # 2. Wait using sleep until 50ms before target to save CPU
    pre_target = target_timestamp - 0.150
    while time.time() < pre_target:
        time.sleep(0.05)

    # precision sleep
    while time.time() < target_timestamp:
        time.sleep(0.01)
    pyautogui.press("enter")
    after_ts = time.time()
    logger.info(
        "message send",
        target_timestamp=target_timestamp,
        after_ts=after_ts,
    )


async def send_discord_message(message: str, trigger_time: datetime, count: int = 1):
    target_timestamp = trigger_time.timestamp()

    for i in range(count):
        if i > 0:
            target_timestamp = time.time()

        await asyncio.to_thread(_send_sync, message, target_timestamp)
        if i < count - 1:
            await asyncio.sleep(10)
