import logging
import sys
import os
from logging.handlers import RotatingFileHandler


def get_app_dir() -> str:
    """Returns the directory containing the executable or script."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class Loggerly:
    """Wraps standard logger to accept structlog-style kwargs."""

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)

    def _process(self, msg: str, kwargs: dict) -> tuple[str, dict]:
        exc_info = kwargs.pop("exc_info", None)
        if kwargs:
            kv_str = " ".join(f"{k}={v}" for k, v in kwargs.items())
            msg = f"{msg}  {kv_str}"
        return msg, {"exc_info": exc_info} if exc_info else {}

    def info(self, msg: str, **kwargs) -> None:
        m, sys_kwargs = self._process(msg, kwargs)
        self.logger.info(m, **sys_kwargs)

    def error(self, msg: str, **kwargs) -> None:
        m, sys_kwargs = self._process(msg, kwargs)
        self.logger.error(m, **sys_kwargs)

    def warning(self, msg: str, **kwargs) -> None:
        m, sys_kwargs = self._process(msg, kwargs)
        self.logger.warning(m, **sys_kwargs)

    def debug(self, msg: str, **kwargs) -> None:
        m, sys_kwargs = self._process(msg, kwargs)
        self.logger.debug(m, **sys_kwargs)

    def exception(self, msg: str, **kwargs) -> None:
        kwargs["exc_info"] = True
        m, sys_kwargs = self._process(msg, kwargs)
        self.logger.exception(m, **sys_kwargs)


def setup_logging() -> None:
    log_dir = get_app_dir()
    log_file = os.path.join(log_dir, "tibialy.log")

    # Unified standard formatter
    standard_formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )

    file_handler = RotatingFileHandler(
        log_file, maxBytes=5 * 1024 * 1024, backupCount=1, encoding="utf-8"
    )
    file_handler.setFormatter(standard_formatter)
    file_handler.setLevel(logging.INFO)

    handlers = [file_handler]

    # Safely attach stream handler only if stdout exists (protects PyInstaller)
    if sys.stdout is not None and hasattr(sys.stdout, "write"):
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setFormatter(standard_formatter)
        handlers.append(stream_handler)

    # Configure Root Logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=handlers,
        force=True,
    )

    # Route Uvicorn logs to our handlers
    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        u_logger = logging.getLogger(logger_name)
        u_logger.handlers = handlers
        u_logger.propagate = False


def get_logger(name: str) -> Loggerly:
    return Loggerly(name)


setup_logging()
