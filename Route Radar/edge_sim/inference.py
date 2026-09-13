import cv2
import base64
import requests
import os
import math
import threading
import queue
import numpy as np
from collections import defaultdict
from ultralytics import YOLO
from gps_simulator import RouteSimulator

# ============================================================
# CONFIGURATION
# ============================================================
BACKEND_URL = "http://127.0.0.1:8000/api/events/"
MODEL_PATH = "yolov8n.pt"
VIDEO_PATH = "sample.mp4"
OUTPUT_PATH = "busense_result.mp4"

# Simulated route
START_LAT = 12.9716
START_LON = 77.5946
END_LAT = 12.9352
END_LON = 77.6245

# Detection thresholds
TRAFFIC_DENSITY_THRESHOLD = 5
RASH_DRIVING_DISPLACEMENT_THRESHOLD = 60
TRAFFIC_COOLDOWN_SECONDS = 10
ANOMALY_COOLDOWN_SECONDS = 5
FRAME_SKIP = 2  # Process every Nth frame for YOLO inference

def encode_image(img):
    _, buffer = cv2.imencode(".jpg", img)
    return base64.b64encode(buffer).decode("utf-8")

# ============================================================
# ASYNC EVENT DISPATCHER
# ============================================================
class EventDispatcher(threading.Thread):
    def __init__(self, backend_url):
        super().__init__(daemon=True)
        self.backend_url = backend_url
        self.queue = queue.Queue()
        self.running = True

    def run(self):
        while self.running:
            try:
                payload = self.queue.get(timeout=1)
                requests.post(self.backend_url, json=payload, timeout=2)
                self.queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                # Backend might be down, ignore in demo to keep edge running
                pass 

    def send_event(self, payload):
        self.queue.put(payload)
        
    def stop(self):
        self.running = False

# ============================================================
# ROAD ANOMALY DETECTOR (CV FALLBACK)
# ============================================================
class RoadAnomalyDetector:
    def __init__(self):
        pass

    def detect(self, frame):
        """
        CV-based fallback for detecting road anomalies (e.g., potholes, cracks).
        Returns a list of bounding boxes (x, y, w, h) for detected anomalies.
        """
        height, width = frame.shape[:2]
        
        # Define ROI: bottom center of the frame (road directly in front)
        roi_y1 = int(height * 0.6)
        roi_y2 = int(height * 0.95)
        roi_x1 = int(width * 0.25)
        roi_x2 = int(width * 0.75)
        
        roi = frame[roi_y1:roi_y2, roi_x1:roi_x2]
        
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (7, 7), 0)
        edges = cv2.Canny(blurred, 50, 150)
        
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        anomalies = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if 500 < area < 5000: # Threshold for "pothole" size
                x, y, w, h = cv2.boundingRect(cnt)
                # Filter out long horizontal/vertical lines (lane markings)
                if 0.2 < w/h < 5: 
                    anomalies.append((x + roi_x1, y + roi_y1, w, h))
                    
        return anomalies

# ============================================================
# MAIN
# ============================================================
def main():
    if not os.path.exists(VIDEO_PATH):
        print(f"Error: Video {VIDEO_PATH} not found.")
        return

    print("Loading YOLOv8 model for vehicles...")
    model = YOLO(MODEL_PATH)

    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        print("Could not open video.")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    total_duration = frame_count / fps if fps > 0 else 60

    print(f"Video resolution : {width}x{height}")
    print(f"FPS              : {fps:.2f}")
    print(f"Frames           : {frame_count}")
    print(f"Duration         : {total_duration:.2f} seconds")

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(OUTPUT_PATH, fourcc, fps, (width, height))
    if not out.isOpened():
        print("ERROR: Could not create output video.")
        cap.release()
        return

    route_sim = RouteSimulator(START_LAT, START_LON, END_LAT, END_LON, total_duration)
    
    # Initialize components
    dispatcher = EventDispatcher(BACKEND_URL)
    dispatcher.start()
    
    anomaly_detector = RoadAnomalyDetector()

    # Tracking states
    track_history = defaultdict(lambda: [])
    reported_rash_ids = set()
    
    is_congested = False
    congestion_clear_timer = 0
    
    last_anomaly_time = 0
    frame_idx = 0
    
    # COCO vehicle class names
    class_names = {2: "Car", 3: "Motorcycle", 5: "Bus", 7: "Truck"}
    relevant_classes = [2, 3, 5, 7]

    # Store last detections to draw on skipped frames
    last_boxes = []
    last_anomalies = []

    print("Starting inference loop...")
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        current_time = frame_idx / fps
        lat, lon = route_sim.get_coordinate_for_time(current_time)
        vehicle_count = 0

        # Frame skipping for heavy object detection
        if frame_idx % FRAME_SKIP == 0:
            # Run YOLO on scaled-down image (imgsz=480) for speed, and filter classes
            results = model.track(frame, persist=True, verbose=False, classes=relevant_classes, imgsz=480)
            
            current_boxes = []
            for r in results:
                boxes = r.boxes
                if boxes is None:
                    continue

                for i, box in enumerate(boxes):
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    
                    track_id = int(boxes.id[i]) if boxes.id is not None else -1
                    current_boxes.append((x1, y1, x2, y2, cls_id, conf, track_id))
                    
            last_boxes = current_boxes
            
            # Detect road anomalies dynamically
            last_anomalies = anomaly_detector.detect(frame)
        
        # Process detections (using last_boxes even on skipped frames to maintain visual continuity)
        for x1, y1, x2, y2, cls_id, conf, track_id in last_boxes:
            vehicle_count += 1
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)
            
            is_rash = False
            if track_id != -1:
                # Rash driving detection
                history = track_history[track_id]
                
                # Only update history on active frames or if skipped, rely on last known. 
                # For simplicity, we just append current center.
                if frame_idx % FRAME_SKIP == 0:
                    history.append((cx, cy))
                    if len(history) > 5:
                        history.pop(0)

                if len(history) >= 2:
                    prev_cx, prev_cy = history[-2]
                    displacement = math.sqrt((cx - prev_cx)**2 + (cy - prev_cy)**2)
                    
                    if displacement > RASH_DRIVING_DISPLACEMENT_THRESHOLD and track_id not in reported_rash_ids:
                        is_rash = True
                        reported_rash_ids.add(track_id)
                        
                        dispatcher.send_event({
                            "lat": lat, "lon": lon, "severity": "high",
                            "event_type": "Rash Driving", "image_data": encode_image(frame)
                        })
                        print(f"Event: Rash Driving [ID: {track_id}] at {current_time:.2f}s")
            
            # Draw box
            box_color = (0, 165, 255) if is_rash else (255, 0, 0)
            label = "RASH DRIVING" if is_rash else f"{class_names.get(cls_id, 'Vehicle')} {conf:.2f}"
            
            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
            cv2.rectangle(frame, (x1, max(0, y1 - 25)), (x1 + 150, y1), box_color, -1)
            cv2.putText(frame, label, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            if track_id != -1:
                cv2.putText(frame, f"ID:{track_id}", (x1, y2 + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)

        # Traffic Congestion Deduplication
        if vehicle_count > TRAFFIC_DENSITY_THRESHOLD:
            congestion_clear_timer = 0
            if not is_congested:
                is_congested = True
                dispatcher.send_event({
                    "lat": lat, "lon": lon, "severity": "medium",
                    "event_type": "Traffic Congestion Started", "image_data": encode_image(frame)
                })
                print(f"Event: Traffic Congestion Started at {current_time:.2f}s")
        else:
            if is_congested:
                congestion_clear_timer += 1
                if congestion_clear_timer > fps * TRAFFIC_COOLDOWN_SECONDS:
                    is_congested = False
                    dispatcher.send_event({
                        "lat": lat, "lon": lon, "severity": "low",
                        "event_type": "Traffic Congestion Cleared", "image_data": encode_image(frame)
                    })
                    print(f"Event: Traffic Cleared at {current_time:.2f}s")

        # Draw road anomalies on every frame
        for (ax, ay, aw, ah) in last_anomalies:
            cv2.rectangle(frame, (ax, ay), (ax+aw, ay+ah), (0, 0, 255), 2)
            cv2.putText(frame, "ROAD ANOMALY", (ax, ay - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,255), 2)

        # Dispatch event with cooldown
        if last_anomalies and (current_time - last_anomaly_time > ANOMALY_COOLDOWN_SECONDS):
            dispatcher.send_event({
                "lat": lat, "lon": lon, "severity": "medium",
                "event_type": "Road Hazard (CV Detected)", "image_data": encode_image(frame)
            })
            print(f"Event: Road Hazard detected at {current_time:.2f}s")
            last_anomaly_time = current_time

        # Information Panel
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (450, 130), (0, 0, 0), -1)
        frame = cv2.addWeighted(overlay, 0.7, frame, 0.3, 0)

        cv2.putText(frame, "BUSENSE - EDGE AI (OPTIMIZED)", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, f"Vehicles: {vehicle_count}", (15, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(frame, f"GPS: {lat:.5f}, {lon:.5f}", (15, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(frame, f"Time: {current_time:.1f}s", (15, 105), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        if is_congested:
            cv2.putText(frame, "TRAFFIC CONGESTION", (250, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)

        out.write(frame)
        frame_idx += 1

        if frame_idx % 100 == 0:
            progress = (frame_idx / frame_count) * 100 if frame_count > 0 else 0
            print(f"Processing: {progress:.1f}%")

    # Cleanup
    cap.release()
    out.release()
    dispatcher.stop()
    dispatcher.join()

    print("\n==========================================")
    print("INFERENCE COMPLETE")
    print(f"Output saved as: {OUTPUT_PATH}")
    print("==========================================")

if __name__ == "__main__":
    main()