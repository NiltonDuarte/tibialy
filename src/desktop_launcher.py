import threading
import webview
import uvicorn
from fastapi import FastAPI
from src.core.logger import get_logger

logger = get_logger("tibialy.desktop")


def start_desktop_app(app: FastAPI) -> None:
    config = uvicorn.Config(
        app, host="127.0.0.1", port=8013, log_level="warning", use_colors=False
    )
    server = uvicorn.Server(config)

    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    window = webview.create_window(
        title="Tibialy",
        url="http://127.0.0.1:8013",
        width=1200,
        height=850,
        background_color="#111827",
    )

    def on_closed() -> None:
        logger.info("window_closed", message="Shutting down local server...")
        server.should_exit = True

    window.events.closed += on_closed
    webview.start()
