import structlog
import sys
import io
import logging
import os
from logging.handlers import RotatingFileHandler
from src.core.websocket import websocket_broadcaster


def get_app_dir() -> str:
    """Returns the directory containing the executable or script."""
    if getattr(sys, "frozen", False):
        # Running as compiled PyInstaller executable
        return os.path.dirname(sys.executable)
    # Running from source
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def setup_logging() -> None:
    if sys.stdout is None or not hasattr(sys.stdout, "isatty"):
        safe_stream = io.StringIO()
        is_a_tty = False
    else:
        safe_stream = sys.stdout
        is_a_tty = safe_stream.isatty()

    log_dir = get_app_dir()
    log_file = os.path.join(log_dir, "tibialy.log")

    # 1. Create standard formatter for Uvicorn/FastAPI logs
    standard_formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )

    file_handler = RotatingFileHandler(
        log_file, maxBytes=5 * 1024 * 1024, backupCount=1, encoding="utf-8"
    )
    # We use basic string formatter here because Structlog handles its own formatting
    # However, standard logs will bypass Structlog and look unformatted.
    # To fix this, we inject the standard formatter.
    file_handler.setFormatter(standard_formatter)
    file_handler.setLevel(logging.INFO)

    stream_handler = logging.StreamHandler(safe_stream)
    stream_handler.setFormatter(standard_formatter)

    # 2. Configure Root Logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=[file_handler, stream_handler],
        force=True,  # Force override existing configs
    )

    # 3. Explicitly intercept Uvicorn loggers and route them to our handlers
    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        u_logger = logging.getLogger(logger_name)
        u_logger.handlers = [file_handler, stream_handler]
        u_logger.propagate = False  # Prevent double-printing to root

    # 4. Configure Structlog
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            websocket_broadcaster,
            # If the log is from structlog, render it cleanly.
            structlog.dev.ConsoleRenderer(colors=is_a_tty),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str):
    return structlog.get_logger().bind(logger=name)


setup_logging()
