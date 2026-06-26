import threading
import time
import urllib.request
import urllib.error
import webview


from src.core.logger import get_logger

logger = get_logger("tibialy.desktop")

_server_pointer = None


def initialize_backend(window: webview.Window) -> None:
    """Runs inside a background thread spawned automatically by pywebview."""
    global _server_pointer
    target_url = "http://127.0.0.1:8013"
    splash_start_time = time.time()

    logger.info(
        "backend_init", message="Window visible. Starting heavy framework imports..."
    )

    # 1. Move heavy module loading INSIDE the thread so they happen while splash is spinning
    from src.app import app
    import uvicorn

    # 2. Configure and run Uvicorn inside this background ecosystem
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=8013,
        log_level="warning",
        use_colors=False,
        log_config=None,
    )
    _server_pointer = uvicorn.Server(config)

    # Run Uvicorn in a sub-thread so this current thread can switch to health monitoring
    server_thread = threading.Thread(target=_server_pointer.run, daemon=True)
    server_thread.start()

    # 3. Poll the server loop until it responds
    logger.info("backend_poll", message="Awaiting Uvicorn socket readiness...")
    while True:
        try:
            with urllib.request.urlopen(target_url, timeout=0.2):
                break
        except urllib.error.HTTPError:
            break  # Server responded (even a 404 means the port is active)
        except Exception:
            time.sleep(0.05)
    MIN_SPLASH_TIME = 1.2
    elapsed_time = time.time() - splash_start_time
    if elapsed_time < MIN_SPLASH_TIME:
        # Only sleep for the leftover duration required to hit 1.2s
        remaining_delay = MIN_SPLASH_TIME - elapsed_time
        time.sleep(remaining_delay)
    # 4. Seamlessly transition out of the loading screen
    logger.info("backend_ready", message="Backend active. Navigating viewport.")
    window.load_url(target_url)


def start_desktop_app() -> None:
    global _server_pointer

    # 2. Define a clean inline splash layout matching your Default Dark theme
    splash_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                background-color: #111827;
                color: #e5e7eb;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                overflow: hidden;
                user-select: none;
            }
            .spinner {
                border: 4px solid #1f2937;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border-left-color: #60a5fa;
                animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                margin-bottom: 24px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            h1 { font-size: 28px; font-weight: 700; margin: 0 0 6px 0; color: #60a5fa; letter-spacing: -0.025em; }
            p { font-size: 14px; margin: 0; color: #9ca3af; }
        </style>
    </head>
    <body>
        <div class="spinner"></div>
        <h1>Tibialy</h1>
        <p>Initializing desktop instance...</p>
    </body>
    </html>
    """

    # 3. Create the window serving the splash content instantly
    window = webview.create_window(
        title="Tibialy",
        html=splash_html,
        width=1200,
        height=850,
        background_color="#111827",
    )

    def on_closed() -> None:
        global _server_pointer
        if _server_pointer:
            logger.info("window_closed", message="Shutting down local server...")
            _server_pointer.should_exit = True

    window.events.closed += on_closed
    webview.start(initialize_backend, [window])
