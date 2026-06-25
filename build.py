import os
import subprocess
import sys


def main():
    print("Starting build process...")

    # Choose the correct separator dynamically (';' on Windows, ':' on Mac/Linux)
    sep = os.pathsep

    command = [
        "pyinstaller",
        "--onefile",
        "--noconfirm",
        "--name",
        "Tibialy",
        "--windowed",
        "--noconsole",
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
    else:
        print("Build failed. See errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
