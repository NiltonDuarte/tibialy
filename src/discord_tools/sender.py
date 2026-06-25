import pyautogui
import asyncio
from src.core.logger import get_logger

logger = get_logger("tibialy.discord.sender")


def _send_sync(message: str):
    logger.info("executing_discord_typing", message_length=len(message))
    pyautogui.write(message, interval=0.01)
    pyautogui.press("enter")
    logger.info("discord_message_sent")


async def send_discord_message(message: str, count: int = 1):
    for i in range(count - 1):
        await asyncio.to_thread(_send_sync, message)
        if i < count - 1:
            await asyncio.sleep(10)
