import structlog
import sys
from src.core.websocket import websocket_broadcaster


def setup_logging() -> None:
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            websocket_broadcaster,
            structlog.dev.ConsoleRenderer(
                colors=sys.stdout.isatty() if sys.stdout else False
            ),
        ],
        logger_factory=structlog.WriteLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str):
    return structlog.get_logger().bind(logger=name)


# BINGO: Initialize immediately when this module is imported!
setup_logging()
