import os
import subprocess
import sys


def main():
    print("Starting build process...")

    is_debug = "--debug" in sys.argv
    app_name = "Tibialy_Debug" if is_debug else "Tibialy"

    sep = os.pathsep

    if sys.platform == "darwin":
        print(f"Detected macOS: Switching to '--onedir' packaging for {app_name}.")
        # macOS requires --windowed to generate a .app bundle
        sys_args = ["--onedir", "--windowed"]
    else:
        print(
            f"Detected {sys.platform}: Retaining standalone '--onefile' compilation for {app_name}."
        )
        sys_args = ["--onefile"]

    if not is_debug:
        # Hide console on Windows standard builds
        if sys.platform != "darwin":
            sys_args.extend(["--windowed", "--noconsole"])

    command = [
        "pyinstaller",
        *sys_args,
        "--noconfirm",
        "--name",
        app_name,
        "--paths",
        ".",
        "--icon",
        "static/images/app_icon.png",
        "--add-data",
        f"static{sep}static",
        "--add-data",
        f"database.yaml{sep}.",
        "--add-data",
        f"templates{sep}templates",
        "--exclude-module",
        "PIL",
        "--exclude-module",
        "Pillow",
        "--exclude-module",
        "setuptools",
        "--exclude-module",
        "pkg_resources",
        "src/main.py",
    ]

    result = subprocess.run(command)

    if result.returncode == 0:
        print("Build successful! Check the 'dist' folder.")
        if sys.platform == "darwin":
            print(f"👉 Execute on Mac using: open dist/{app_name}.app")
    else:
        print("Build failed. See errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
