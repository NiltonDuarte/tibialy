import subprocess
import sys


def main():
    print("🚀 Starting build process...")
    command = [
        "pyinstaller",
        "--noconfirm",
        "--name",
        "Tibialy",
        "--windowed",
        "--noconsole",
        "--paths",
        ".",
        "--add-data",
        "static:static",
        "--add-data",
        "templates:templates",
        "src/main.py",
    ]

    # Run the command and print the output live
    result = subprocess.run(command)

    if result.returncode == 0:
        print("✅ Build successful! Check the 'dist' folder.")
    else:
        print("❌ Build failed. See errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
