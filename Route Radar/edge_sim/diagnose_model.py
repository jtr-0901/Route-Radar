"""
Diagnostic script: probe what the pothole model is actually outputting on raw frames.
Runs without ANY of the pipeline filters (no ROI, no conf threshold, no size/colour/area filters).
Prints a distribution of raw confidence scores to understand where real detections sit.
"""
import cv2
import os
import sys
import numpy as np
from ultralytics import YOLO

_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_HERE)
MODEL_PATH = os.path.join(_PROJECT_ROOT, "models", "pothole_yolov8s.pt")
VIDEO_PATH = os.path.join(_HERE, "sample2.mp4")

print(f"Model: {MODEL_PATH}")
print(f"Video: {VIDEO_PATH}")
print(f"Model exists: {os.path.exists(MODEL_PATH)}")
print()

model = YOLO(MODEL_PATH)

cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    print("ERROR: Cannot open video")
    sys.exit(1)

fps = cap.get(cv2.CAP_PROP_FPS)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print(f"Video: {width}x{height} @ {fps:.1f} fps, {total} frames ({total/fps:.0f}s)")
print()

all_confs = []
frames_with_any  = 0  # frames with >=1 detection at conf>0.05
frames_sampled   = 0
SAMPLE_EVERY     = 5   # check every 5th frame
CONF_PROBE       = 0.05  # very low floor just to see what the model produces

# Per-conf-bucket count
buckets = {
    "0.05-0.10": 0,
    "0.10-0.20": 0,
    "0.20-0.30": 0,
    "0.30-0.40": 0,
    "0.40-0.50": 0,
    "0.50-0.65": 0,
    "0.65+":     0,
}

frame_idx = 0
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    frame_idx += 1
    if frame_idx % SAMPLE_EVERY != 0:
        continue
    frames_sampled += 1

    # Run on FULL frame (no ROI crop) with very low conf so we see everything
    results = model(frame, verbose=False, conf=CONF_PROBE, imgsz=640)
    
    frame_had_det = False
    for r in results:
        if r.boxes is None:
            continue
        for box in r.boxes:
            c = float(box.conf[0])
            all_confs.append(c)
            frame_had_det = True
            if   c < 0.10: buckets["0.05-0.10"] += 1
            elif c < 0.20: buckets["0.10-0.20"] += 1
            elif c < 0.30: buckets["0.20-0.30"] += 1
            elif c < 0.40: buckets["0.30-0.40"] += 1
            elif c < 0.50: buckets["0.40-0.50"] += 1
            elif c < 0.65: buckets["0.50-0.65"] += 1
            else:           buckets["0.65+"]     += 1
    if frame_had_det:
        frames_with_any += 1

cap.release()

print(f"Frames sampled (every {SAMPLE_EVERY}th): {frames_sampled}")
print(f"Frames with >=1 detection at conf>0.05: {frames_with_any}")
print(f"Total raw detections at conf>0.05: {len(all_confs)}")
print()
print("Confidence distribution:")
for k, v in buckets.items():
    bar = "█" * min(v, 60)
    print(f"  {k}: {v:4d}  {bar}")
print()
if all_confs:
    print(f"Mean conf: {np.mean(all_confs):.3f}")
    print(f"Max  conf: {np.max(all_confs):.3f}")
    print(f"P75  conf: {np.percentile(all_confs, 75):.3f}")
    print(f"P50  conf: {np.percentile(all_confs, 50):.3f}")
    print(f"P25  conf: {np.percentile(all_confs, 25):.3f}")
else:
    print("Model produced ZERO detections even at conf=0.05 — model may be wrong file or wrong architecture.")
