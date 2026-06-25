import structlog
import sys
import io
from src.core.websocket import websocket_broadcaster


def setup_logging() -> None:
    # Evaluate streams dynamically inside the setup function
    if sys.stdout is None:
        safe_stream = io.StringIO()
        is_a_tty = False
    else:
        safe_stream = sys.stdout
        is_a_tty = safe_stream.isatty()

    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            websocket_broadcaster,
            # Explicitly force ConsoleRenderer to use our safe_stream object instead of sys.stdout
            structlog.dev.ConsoleRenderer(colors=is_a_tty),
        ],
        logger_factory=structlog.PrintLoggerFactory(file=safe_stream),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str):
    return structlog.get_logger().bind(logger=name)


setup_logging()
