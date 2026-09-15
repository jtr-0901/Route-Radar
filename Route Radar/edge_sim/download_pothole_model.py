"""
Download pothole detection model from HuggingFace.
Model: keremberke/yolov8s-pothole-segmentation
License: MIT (https://huggingface.co/keremberke/yolov8s-pothole-segmentation)
"""
import os
import sys
import urllib.request
import urllib.error

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")
MODEL_FILENAME = "pothole_yolov8s.pt"
MODEL_PATH = os.path.join(MODELS_DIR, MODEL_FILENAME)

# Direct HuggingFace download URL for keremberke yolov8m pothole segmentation model
# This model supports classes: pothole (segmentation mask supported)
HF_URL = "https://huggingface.co/keremberke/yolov8m-pothole-segmentation/resolve/main/best.pt"

def download_model():
    os.makedirs(MODELS_DIR, exist_ok=True)

    if os.path.exists(MODEL_PATH):
        size = os.path.getsize(MODEL_PATH)
        print(f"Model already exists at: {MODEL_PATH} ({size / 1024 / 1024:.1f} MB)")
        return True

    print(f"Downloading pothole model from HuggingFace...")
    print(f"  URL  : {HF_URL}")
    print(f"  Dest : {MODEL_PATH}")
    print()

    def reporthook(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            pct = min(downloaded / total_size * 100, 100)
            mb = downloaded / 1024 / 1024
            total_mb = total_size / 1024 / 1024
            print(f"\r  Progress: {pct:.1f}%  ({mb:.1f} / {total_mb:.1f} MB)", end="", flush=True)

    try:
        urllib.request.urlretrieve(HF_URL, MODEL_PATH, reporthook)
        print()  # newline after progress
    except urllib.error.URLError as e:
        print(f"\nERROR: Download failed: {e}")
        print("Please download the model manually from:")
        print(f"  {HF_URL}")
        print(f"and place it at: {MODEL_PATH}")
        return False

    size = os.path.getsize(MODEL_PATH)
    if size < 100_000:
        os.remove(MODEL_PATH)
        print(f"ERROR: Downloaded file is too small ({size} bytes). Download may have failed.")
        return False

    print(f"Download complete! ({size / 1024 / 1024:.1f} MB)")
    print(f"Model saved to: {MODEL_PATH}")
    return True

if __name__ == "__main__":
    success = download_model()
    if success:
        # Quick validation
        try:
            from ultralytics import YOLO
            print("\nValidating model...")
            model = YOLO(MODEL_PATH)
            print(f"Model loaded successfully!")
        except Exception as e:
            print(f"Warning: Model validation error: {e}")
    sys.exit(0 if success else 1)
