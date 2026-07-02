# Tibialy

Tibialy desktop application. Provides helper tools for the MMORPG Tibia. Built with Python and FastAPI. Packaged via PyWebview. Does not interact with game client. Does not read game memory.

Source repository: https://github.com/NiltonDuarte/tibialy



## Download & Installation

Executable files are automatically built and published via GitHub Actions.

1. Navigate to the [Releases page](https://github.com/NiltonDuarte/tibialy/releases).
2. Expand the **Assets** section of the latest release.
3. Download the archive for your operating system:
   * **Windows**: Download `Tibialy-vX.X.X-Windows.zip`.
   * **macOS**: Download `Tibialy-vX.X.X-macOS.zip`.
4. Extract the `.zip` archive.
5. Run the extracted application (`Tibialy.exe` on Windows, `Tibialy.app` on macOS).

*Note: `Tibialy-Debug-...` archives are also available. These keep the background console window open for troubleshooting.*

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
Then open the app normally.



## Precision Discord Scheduler

Included in this repository is a lightweight, high-precision command-line scheduler. It is designed to automatically paste and send a specific message in Discord at an exact millisecond timestamp, utilizing low-level OS APIs (CoreGraphics on macOS, User32 on Windows) to bypass standard input latency.

### Installation

If you have the repository cloned, the script is already available in the root folder. If you want to download it directly without cloning, run the following command in your terminal:

```bash
curl -O https://raw.githubusercontent.com/NiltonDuarte/tibialy/main/tibialy_discord_cmd.py
```

### Usage

1. Open your terminal or command prompt and navigate to the folder containing the script.
2. Execute the script using Python:
```bash
python tibialy_discord_cmd.py
```
3. Type the message you want to send when prompted and hit Enter.
4. When prompted for the time, press Enter to use the default target time (09:59:56), or input a custom time to override it.

**Important**: Immediately click inside the Discord text box where you want the message sent and leave it focused. Do not minimize the window or click away.

### Testing a Custom Target Time
If you want to test the script to ensure it interacts with Discord properly on your system, you can set a custom target time for a few seconds in the future.

When the script asks for a target time, provide it in the HH:MM:SS 24-hour format (e.g., if it is currently 14:30:00, you can test it by inputting 14:30:15). The script will wait until that exact moment, paste your message, and hit Enter.

### OS-Specific Notes
**macOS Users**: The first time you run this script, macOS will likely block the keystroke. You must go to System Settings > Privacy & Security > Accessibility and grant permission to your Terminal application.

**Power Settings**: The script automatically prevents your computer from sleeping while the countdown is active. It will restore normal sleep behavior once the message is sent.
