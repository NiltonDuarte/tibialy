import structlog
from src.core.websocket import websocket_broadcaster


def setup_logging() -> None:
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            websocket_broadcaster,
            structlog.dev.ConsoleRenderer(colors=True),
        ],
        logger_factory=structlog.WriteLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str):
    # Bind the logger name directly to the instance
    return structlog.get_logger().bind(logger=name)
