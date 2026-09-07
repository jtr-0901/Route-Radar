import os
import subprocess
import sys


OUTPUT_FILE = "sample.mp4"

SEARCH_QUERIES = [
    "Indian road driving dashcam",
    "Bangalore traffic dashcam driving",
    "India city traffic dashcam",
    "Indian traffic POV driving",
]


def ensure_ytdlp():
    try:
        import yt_dlp
        print("yt-dlp is installed.")
    except ImportError:
        print("Installing yt-dlp...")
        subprocess.check_call([
            sys.executable,
            "-m",
            "pip",
            "install",
            "-U",
            "yt-dlp"
        ])


def try_download(query):
    print()
    print("=" * 60)
    print("Searching:", query)
    print("=" * 60)

    command = [
        sys.executable,
        "-m",
        "yt_dlp",

        f"ytsearch5:{query}",

        "--no-playlist",

        # Accept videos at least 30 seconds long.
        "--match-filter",
        "duration >= 30",

        # Try several possible formats.
        # Do NOT force MP4.
        "-f",
        "bv*+ba/b",

        # Convert/merge the result to MP4.
        "--merge-output-format",
        "mp4",

        "--output",
        OUTPUT_FILE,

        "--no-overwrites",

        # Continue searching if one result fails.
        "--ignore-errors",
    ]

    result = subprocess.run(command)

    if os.path.exists(OUTPUT_FILE):
        size = os.path.getsize(OUTPUT_FILE)

        if size > 1_000_000:
            print()
            print("=" * 60)
            print("SUCCESS")
            print("=" * 60)
            print(f"Created: {OUTPUT_FILE}")
            print(f"Size: {size / (1024 * 1024):.2f} MB")
            print("=" * 60)
            return True

        os.remove(OUTPUT_FILE)

    return False


def main():
    ensure_ytdlp()

    if os.path.exists(OUTPUT_FILE):
        print(f"{OUTPUT_FILE} already exists.")
        return

    for query in SEARCH_QUERIES:
        if try_download(query):
            return

    print()
    print("=" * 60)
    print("DOWNLOAD FAILED")
    print("=" * 60)
    print("No usable Indian dashcam video was downloaded.")


if __name__ == "__main__":
    main()