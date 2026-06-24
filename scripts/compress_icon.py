import os
from PIL import Image


def compress_icon(file_path: str, max_size_kilobytes: int = 500) -> None:
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    original_size_bytes = os.path.getsize(file_path)
    original_size_kilobytes = original_size_bytes / 1024

    if original_size_kilobytes <= max_size_kilobytes:
        print(
            f"Success: File is already {original_size_kilobytes:.2f} KB. No compression needed."
        )
        return

    with Image.open(file_path) as image:
        # 512x512 is standard maximum for desktop app icons
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        image.save(file_path, format="PNG", optimize=True)

    new_size_bytes = os.path.getsize(file_path)
    new_size_kilobytes = new_size_bytes / 1024

    print(
        f"Compression complete: {original_size_kilobytes:.2f} KB -> {new_size_kilobytes:.2f} KB"
    )


if __name__ == "__main__":
    compress_icon("static/images/app_icon.png")
