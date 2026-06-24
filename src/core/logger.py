import structlog
import asyncio
import json
from typing import Any, Dict
from src.core.ws import manager

def ws_broadcaster(logger: Any, method_name: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    # Skip if no UI is actively watching
    if not manager.active_connections:
        return event_dict
        
    payload = json.dumps(event_dict)
    
    try:
        # Fast path: We are inside the main event loop
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(payload))
    except RuntimeError:
        # Slow path: We are in a background thread (FastAPI routes, Discord PyAutoGUI sender)
        if manager.loop and manager.loop.is_running():
            asyncio.run_coroutine_threadsafe(manager.broadcast(payload), manager.loop)
            
    return event_dict

def setup_logging() -> None:
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            ws_broadcaster,  
            structlog.dev.ConsoleRenderer(colors=True),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

def get_logger(name: str) -> structlog.BoundLogger:
    return structlog.get_logger(name)