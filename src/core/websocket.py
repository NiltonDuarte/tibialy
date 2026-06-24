from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Any, Dict
import asyncio
import json

router = APIRouter(prefix="/websocket", tags=["websocket"])


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self.loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str) -> None:
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


@router.websocket("/logs")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


def websocket_broadcaster(
    logger: Any, method_name: str, event_dict: Dict[str, Any]
) -> Dict[str, Any]:
    """Intercepts logs and broadcasts them. Fails silently to protect terminal logging."""
    try:
        if not manager.active_connections:
            return event_dict

        payload = json.dumps(event_dict)

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.broadcast(payload))
        except RuntimeError:
            if manager.loop and manager.loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast(payload), manager.loop
                )
    except Exception:
        # Catch any serialization or loop errors silently so the terminal still gets the log
        pass

    return event_dict
