# pyrefly: ignore [missing-import]
import cv2
import base64
import requests
import os
import json
import threading
import queue
import numpy as np
from ultralytics import YOLO

from gps_simulator import RouteSimulator
from detection.pothole_detector import PotholeDetector
from detection.vehicle_detector import VehicleDetector
from tracking.pothole_tracker import PotholeTracker
from assessment.severity import SeverityAssessor
from assessment.risk_score import RiskScorer
from assessment.action_recommender import ActionRecommender
from rules.rules_engine import RulesEngine
from reporting.annotator import Annotator
from reporting.event_store import EventStore

# ============================================================
# PATHS
# ============================================================
_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_HERE)
_MODELS_DIR = os.path.join(_PROJECT_ROOT, "models")
_CONFIG_DIR = os.path.join(_HERE, "config")
_RULES_DIR = os.path.join(_HERE, "rules", "india")

# ============================================================
# EVENT DISPATCHER
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
                try:
                    requests.post(self.backend_url, json=payload, timeout=2)
                except Exception as e:
                    # Ignore connection errors in demo mode
                    pass
                self.queue.task_done()
            except queue.Empty:
                continue

    def send_event(self, payload):
        self.queue.put(payload)
        
    def stop(self):
        self.running = False

def encode_thumbnail(img, box, padding=40):
    """Crop the pothole bounding box (with padding) and encode as a small JPEG thumbnail.
    This keeps API payloads tiny vs. encoding the entire full-resolution frame."""
    h, w = img.shape[:2]
    x1, y1, x2, y2 = box
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)
    crop = img[y1:y2, x1:x2]
    if crop.size == 0:
        crop = img  # fallback to full frame if box is degenerate
    # Resize to a small fixed thumbnail
    thumb = cv2.resize(crop, (320, 240), interpolation=cv2.INTER_AREA)
    _, buffer = cv2.imencode(".jpg", thumb, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return base64.b64encode(buffer).decode("utf-8")

# ============================================================
# MAIN ORCHESTRATOR
# ============================================================
def main():
    # Load Configurations
    with open(os.path.join(_CONFIG_DIR, "road_context.json"), "r") as f:
        road_context = json.load(f)
        
    with open(os.path.join(_CONFIG_DIR, "thresholds.json"), "r") as f:
        thresholds = json.load(f)

    # Setup Backend/Dispatcher
    backend_url = "http://127.0.0.1:8000/api/events/"
    dispatcher = EventDispatcher(backend_url)
    dispatcher.start()

    # Initialize Modules
    print("Initializing Rules Engine...")
    rules_engine = RulesEngine(_RULES_DIR)
    
    print("Loading Models...")
    # Load models
    vehicle_model_path = os.path.join(_HERE, "yolov8n.pt")
    pothole_model_path = os.path.join(_MODELS_DIR, "pothole_yolov8s.pt")
    
    if not os.path.exists(pothole_model_path):
        print(f"ERROR: Pothole model not found at {pothole_model_path}. Run download_pothole_model.py first.")
        return

    vehicle_yolo = YOLO(vehicle_model_path)
    pothole_yolo = YOLO(pothole_model_path)
    
    # Instantiate Pipeline Components
    vehicle_detector = VehicleDetector(vehicle_yolo)
    pothole_detector = PotholeDetector(pothole_yolo, road_context, thresholds)
    pothole_tracker = PotholeTracker(thresholds)
    severity_assessor = SeverityAssessor(thresholds)
    risk_scorer = RiskScorer(thresholds)
    action_recommender = ActionRecommender(rules_engine)
    annotator = Annotator()
    event_store = EventStore(_HERE, road_context.get("session_id", "SESSION-DEFAULT"))
    
    # Video Setup
    video_path = os.path.join(_HERE, "sample.mp4")  # 27MB — fast for testing; switch to sample.mp4 for full run
    output_path = os.path.join(_HERE, "busense_result.mp4")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Could not open video: {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps if fps > 0 else 60

    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    
    # GPS Simulator
    route_sim = RouteSimulator(12.9716, 77.5946, 12.9352, 77.6245, duration)
    
    # Execution State
    frame_idx = 0
    frame_skip = thresholds.get("detection", {}).get("frame_skip", {}).get("value", 2)
    last_vehicles = []
    last_persons = []
    last_pothole_anomalies = []
    last_masks = []
    reported_potholes = set()
    
    print("Starting Pipeline...")
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        current_time = frame_idx / fps
        lat, lon = route_sim.get_coordinate_for_time(current_time)
        
        # 1. Detection Phase (skip frames for performance)
        if frame_idx % frame_skip == 0:
            last_vehicles, last_persons = vehicle_detector.detect(frame)
            last_pothole_anomalies, last_masks = pothole_detector.detect(
                frame, last_vehicles, last_persons
            )
            
        # Update context
        road_context["vehicle_count"] = len(last_vehicles)
        frame_brightness = frame.mean()
        
        # 2. Tracking Phase
        active_potholes = pothole_tracker.update(last_pothole_anomalies, frame_idx, current_time)
        
        # Check for clustering
        cluster_count = len(active_potholes) # Simplification: all active in frame are a cluster
        road_context["cluster_count"] = cluster_count
        
        # 3. Assessment & Rules Phase
        for record in active_potholes:
            pid = record["pothole_id"]
            
            # Update GPS
            if road_context.get("gps_available", True):
                pothole_tracker.update_record_gps(pid, lat, lon)
                record["gps_lat"] = lat
                record["gps_lon"] = lon
                
            # Assess Severity
            sev_label, sev_level = severity_assessor.assess(record, frame, road_context.get("road_type"))
            record["severity"] = sev_label
            record["severity_level"] = sev_level
            
            # Assess Risk
            risk_score, reasons = risk_scorer.calculate_risk(record, road_context, frame_brightness)
            record["risk_score"] = risk_score
            record["reason_breakdown"] = reasons
            
            # Recommend Action
            priority, action, response_time, source = action_recommender.recommend(
                sev_label, sev_level, road_context.get("road_type")
            )
            record["action_priority"] = priority
            record["recommended_action"] = action
            
            # Apply Rules Engine Flags
            context_snapshot = {
                "road_type": road_context.get("road_type"),
                "pothole_detected": True,
                "lane_position": record.get("lane_position"),
                "water_detected": record.get("water_detected"),
                "cluster_count": cluster_count,
                "high_traffic": road_context["vehicle_count"] > thresholds.get("risk", {}).get("traffic_density_high_threshold", {}).get("value", 8),
                "vulnerable_users_present": road_context.get("vulnerable_users_present", False),
                "poor_visibility": frame_brightness < thresholds.get("risk", {}).get("visibility_dark_threshold", {}).get("value", 80)
            }
            
            matched_pavement = rules_engine.evaluate_pavement_rules(context_snapshot)
            matched_safety = rules_engine.evaluate_safety_rules(context_snapshot)
            record["matched_rules"] = [r["rule_id"] for r in matched_pavement + matched_safety]
            
            # Update tracker state
            pothole_tracker.update_record_assessment(pid, sev_label, risk_score)
            
            # 4. Dispatch and Store Evidence (Once per newly confirmed pothole)
            if record.get("is_newly_confirmed") and pid not in reported_potholes:
                reported_potholes.add(pid)
                
                box_coords = record.get("box", [0, 0, 1, 1])
                payload = {
                    "event_id": pid,
                    "event_type": "Pothole",
                    "lat": lat,
                    "lon": lon,
                    "severity_level": sev_level,
                    "severity_label": sev_label,
                    "risk_score": risk_score,
                    "action_priority": priority,
                    "recommended_action": action,
                    "reason_breakdown": json.dumps(reasons),
                    "road_type": road_context.get("road_type"),
                    "matched_rules": json.dumps(record["matched_rules"]),
                    "image_data": encode_thumbnail(frame, list(map(int, box_coords)))
                }
                dispatcher.send_event(payload)
                
                # Save to disk
                event_store.save_event(record, frame)
                print(f"[{current_time:.1f}s] Event Dispatch: {pid} ({sev_label}, Risk: {risk_score})")

        # 5. Annotation Phase
        annotated_frame = annotator.annotate_frame(frame, active_potholes, last_masks, road_context)
        out.write(annotated_frame)
        
        frame_idx += 1
        if frame_idx % 50 == 0:
            print(f"Processing: {frame_idx}/{frame_count} frames")

    # Cleanup
    cap.release()
    out.release()
    dispatcher.stop()
    dispatcher.join()
    print("Inference Complete.")

if __name__ == "__main__":
    main()