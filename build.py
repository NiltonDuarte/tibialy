import subprocess
import sys


def main():
    print("Starting build process...")
    command = [
        "pyinstaller",
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
        "static:static",
        "--add-data",
        "database.yaml:.",
        "--add-data",
        "templates:templates",
        "--exclude-module",
        "PIL",  # <-- Block PIL
        "--exclude-module",
        "Pillow",  # <-- Block Pillow
        "--exclude-module",
        "setuptools",
        "--exclude-module",
        "pkg_resources",
        "src/main.py",
    ]

    # Run the command and print the output live
    result = subprocess.run(command)

    if result.returncode == 0:
        print("Build successful! Check the 'dist' folder.")
    else:
        print("Build failed. See errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
