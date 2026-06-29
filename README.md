# Tibialy

Tibialy desktop application. Provides helper tools for the MMORPG Tibia. Built with Python and FastAPI. Packaged via PyWebview. Does not interact with game client. Does not read game memory.

Source repository: https://github.com/NiltonDuarte/tibialy

## Features

* **Alarms Tool**: Text-to-speech (TTS) notifications. Tracks skill potions, plasma rings, custom recurring/one-off timers.
* **Discord Tool**: Automated Discord booking message scheduling. Uses OS clipboard and simulated keystrokes to post at exact timestamps.
* **Hunting Grounds**: Local database for spawns. Tracks creature HP, damage types, weaknesses, optimal charm setups.
* **Imbuement Calculator**: Cost efficiency analyzer. Compares pure market purchasing vs. Gold Token conversion strategies.
* **Utilities**: Stamina tracker with real-time regeneration calculation. Party loot splitter parsing in-game session logs.
* **Settings**: Dynamic theme switcher. Global volume control.

## Tech Stack

* **Backend**: Python 3.12+, FastAPI, Uvicorn.
* **Task Scheduling**: APScheduler (AsyncIOScheduler).
* **Desktop Integration**: PyWebview, PyAutoGUI, Pyperclip, PyTTSX3.
* **Frontend**: HTML, JavaScript, Tailwind CSS (via CDN/static config), Jinja2.
* **Packaging**: PyInstaller.
* **Toolchain**: Hatch, uv, Poe the Poet, Ruff.

## Development Setup

Environment requires Python >= 3.12 and `uv` package manager.

1. Clone repository:
```bash
git clone [https://github.com/NiltonDuarte/tibialy.git](https://github.com/NiltonDuarte/tibialy.git)
cd tibialy
```

2. Sync dependencies:
```bash
uv sync
```

3. Run development server (hot-reload):
```bash
uv run poe run
```

4. Format and lint code:
```bash
uv run pre-commit run --all-files
```

## Build Executable

Compilation process creates standalone executable for Windows/macOS.

Run build script:
```bash
uv run poe build
```

Run build debug script:
```bash
uv run poe build --debug
```

Output generation located in `dist/` directory.

## Architecture

Codebase structure uses feature-driven modules.

```text
├── build.py                  # PyInstaller build script
├── pyproject.toml            # Project configuration and dependencies
├── src/
│   ├── alarms/               # TTS Alarm endpoints and logic
│   ├── core/                 # Shared core (Websockets, Logger, Scheduler)
│   ├── discord_tools/        # Discord booking and keystroke automation
│   ├── jobs.py               # Active task monitoring endpoints
│   ├── ui.py                 # Jinja2 template rendering
│   ├── app.py                # FastAPI application factory
│   ├── desktop_launcher.py   # PyWebview thread management
│   └── main.py               # Application entry point
├── static/                   # CSS, JS, Images, JSON Databases
└── templates/                # HTML Partials and Views
```

## FAQ & Troubleshooting

### Windows

**Q: Windows SmartScreen blocked the application from running ("Windows protected your PC").**
Unsigned executables often trigger SmartScreen.
Fix: Click **More info** > **Run anyway**.

**Q: Windows Defender or my antivirus deleted the executable.**
Compiled Python applications (PyInstaller) sometimes trigger false positives in heuristic scans.
Fix: Add the `dist/` folder or the `Tibialy.exe` file to your antivirus exclusion/exception list, then rebuild or restore the file.

### macOS

**Q: I get a warning that "Tibialy cannot be opened because the developer cannot be verified."**
macOS Gatekeeper blocks unsigned apps downloaded from the internet or built locally without Apple Developer certificates.
Fix:
1. Open **System Settings** > **Privacy & Security**.
2. Scroll down to the Security section.
3. Find the message about Tibialy being blocked and click **Open Anyway**.

**Q: macOS says "Tibialy is damaged and can't be opened. You should move it to the Trash."**
This is a strict Gatekeeper quarantine policy, common with unsigned bundles.
Fix: Strip the quarantine attribute using the terminal.
```bash
xattr -cr /path/to/dist/Tibialy.app
```
