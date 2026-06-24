from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Any, Dict
import asyncio
import json
import traceback

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
            except Exception as e:
                print(f"\n[WS FATAL ERROR] Failed to send_text: {repr(e)}")
                traceback.print_exc()
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
    """Intercepts logs and broadcasts them. Fails loudly on fatal errors without blocking."""

    if not manager.active_connections:
        return event_dict

    try:
        payload = json.dumps(event_dict, default=str)
    except Exception as e:
        print(f"\n[FATAL ERROR] JSON Serialization failed: {e}")
        traceback.print_exc()
        return event_dict

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(payload))

    except RuntimeError:
        if manager.loop and manager.loop.is_running():
            future = asyncio.run_coroutine_threadsafe(
                manager.broadcast(payload), manager.loop
            )

            # Non-blocking callback to report errors if the threadsafe push fails
            def _log_future_exception(fut: asyncio.Future) -> None:
                try:
                    fut.result()
                except Exception as exc:
                    print(f"\n[FATAL ERROR] Threadsafe bridge CRASHED: {exc}")
                    traceback.print_exc()

            future.add_done_callback(_log_future_exception)
        else:
            print(
                f"\n[FATAL ERROR] Main event loop is missing or dead! Manager Loop state: {manager.loop}"
            )

    return event_dict
