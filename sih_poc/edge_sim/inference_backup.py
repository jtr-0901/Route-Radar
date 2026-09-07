import cv2
import base64
import requests
from ultralytics import YOLO
import time
from gps_simulator import RouteSimulator
import os
import math
from collections import defaultdict

# Configuration
BACKEND_URL = "http://127.0.0.1:8000/api/events/"
MODEL_PATH = "yolov8n.pt" 
VIDEO_PATH = "sample.mp4"

# Simulated route
START_LAT = 12.9716
START_LON = 77.5946
END_LAT = 12.9352
END_LON = 77.6245

# Heuristic Thresholds
TRAFFIC_DENSITY_THRESHOLD = 5 # Number of vehicles in a frame to flag traffic
RASH_DRIVING_DISPLACEMENT_THRESHOLD = 60 # Pixels moved between frames to flag as 'sudden/rash'

def encode_image(img):
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

def main():
    if not os.path.exists(VIDEO_PATH):
        print(f"Error: Video {VIDEO_PATH} not found.")
        return

    print("Loading YOLOv8 model for tracking...")
    model = YOLO(MODEL_PATH)

    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    total_duration = frame_count / fps if fps > 0 else 60

    route_sim = RouteSimulator(START_LAT, START_LON, END_LAT, END_LON, total_duration)

    # Tracking History
    track_history = defaultdict(lambda: [])
    
    # Throttling to prevent API spam
    last_defect_time = 0
    last_traffic_time = 0
    last_rash_time = defaultdict(lambda: 0)

    frame_idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        current_time = frame_idx / fps
        lat, lon = route_sim.get_coordinate_for_time(current_time)

        # Run inference with tracking
        results = model.track(frame, persist=True, stream=True, verbose=False)
        
        events_to_send = []
        vehicle_count = 0
        
        for r in results:
            boxes = r.boxes
            if boxes.id is None:
                continue # No objects tracked in this frame
                
            for i, box in enumerate(boxes):
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                track_id = int(boxes.id[i])
                
                # Check for "Simulated Pothole" (using 'person' or 'stop sign' as proxy for POC if we don't have a pothole model)
                # Actually, let's keep it strictly to classes 2 (car), 3 (motorcycle), 5 (bus), 7 (truck) for vehicles
                is_vehicle = cls_id in [2, 3, 5, 7]
                
                if is_vehicle:
                    vehicle_count += 1
                    
                    # RASH DRIVING HEURISTIC
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cx = int((x1 + x2) / 2)
                    cy = int((y1 + y2) / 2)
                    
                    history = track_history[track_id]
                    history.append((cx, cy))
                    if len(history) > 5:
                        history.pop(0) # Keep only last 5 frames
                        
                    if len(history) >= 2:
                        prev_cx, prev_cy = history[-2]
                        displacement = math.sqrt((cx - prev_cx)**2 + (cy - prev_cy)**2)
                        
                        if displacement > RASH_DRIVING_DISPLACEMENT_THRESHOLD:
                            # Flag rash driving if we haven't flagged this vehicle recently
                            if current_time - last_rash_time[track_id] > 3.0:
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 165, 255), 3) # Orange box
                                events_to_send.append({
                                    "lat": lat, "lon": lon,
                                    "severity": "high",
                                    "event_type": "Rash Driving",
                                    "image_data": encode_image(frame)
                                })
                                last_rash_time[track_id] = current_time
                                
        # ---------------------------------------------------------
        # DEMO SIMULATION: Force a simulated pothole every 10 seconds
        # Since the sample video doesn't have stop signs or potholes,
        # we draw a mock bounding box on the road to prove the UI works.
        # ---------------------------------------------------------
        if current_time - last_defect_time > 10.0 and frame_idx > 15:
            h, w = frame.shape[:2]
            # Draw a box in the lower middle of the screen (on the road)
            px1, py1 = int(w/2) - 40, int(h - 120)
            px2, py2 = int(w/2) + 40, int(h - 60)
            
            cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 0, 255), 3) # Red box
            cv2.putText(frame, "Pothole", (px1, py1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            
            events_to_send.append({
                "lat": lat, "lon": lon,
                "severity": "medium",
                "event_type": "Road Defect (Simulated)",
                "image_data": encode_image(frame)
            })
            last_defect_time = current_time
        # TRAFFIC DENSITY HEURISTIC
        if vehicle_count > TRAFFIC_DENSITY_THRESHOLD:
            if current_time - last_traffic_time > 5.0: # Throttle traffic events
                events_to_send.append({
                    "lat": lat, "lon": lon,
                    "severity": "low",
                    "event_type": "Traffic Congestion",
                    "image_data": encode_image(frame)
                })
                last_traffic_time = current_time

        # Send all gathered events
        for payload in events_to_send:
            print(f"Event: {payload['event_type']} at {current_time:.2f}s (Lat/Lon: {lat:.4f}, {lon:.4f})")
            try:
                requests.post(BACKEND_URL, json=payload, timeout=2)
            except Exception as e:
                pass
            
        frame_idx += 1

    cap.release()
    print("Inference complete.")

if __name__ == "__main__":
    main()
