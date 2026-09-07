import cv2
import base64
import requests
from ultralytics import YOLO
from gps_simulator import RouteSimulator
import os
import math
from collections import defaultdict

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


# ============================================================
# IMAGE ENCODING
# ============================================================

def encode_image(img):
    _, buffer = cv2.imencode(".jpg", img)
    return base64.b64encode(buffer).decode("utf-8")


# ============================================================
# MAIN
# ============================================================

def main():

    if not os.path.exists(VIDEO_PATH):
        print(f"Error: Video {VIDEO_PATH} not found.")
        return

    print("Loading YOLOv8 model...")
    model = YOLO(MODEL_PATH)

    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        print("Could not open video.")
        return

    # --------------------------------------------------------
    # VIDEO INFORMATION
    # --------------------------------------------------------

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    total_duration = frame_count / fps if fps > 0 else 60

    print(f"Video resolution : {width}x{height}")
    print(f"FPS              : {fps:.2f}")
    print(f"Frames           : {frame_count}")
    print(f"Duration         : {total_duration:.2f} seconds")

    # --------------------------------------------------------
    # OUTPUT VIDEO
    # --------------------------------------------------------

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    out = cv2.VideoWriter(
        OUTPUT_PATH,
        fourcc,
        fps,
        (width, height)
    )

    if not out.isOpened():
        print("ERROR: Could not create output video.")
        cap.release()
        return

    print(f"Saving annotated video to: {OUTPUT_PATH}")

    # --------------------------------------------------------
    # GPS SIMULATOR
    # --------------------------------------------------------

    route_sim = RouteSimulator(
        START_LAT,
        START_LON,
        END_LAT,
        END_LON,
        total_duration
    )

    # --------------------------------------------------------
    # TRACKING
    # --------------------------------------------------------

    track_history = defaultdict(lambda: [])

    last_defect_time = 0
    last_traffic_time = 0
    last_rash_time = defaultdict(lambda: 0)

    frame_idx = 0

    # COCO vehicle class names
    class_names = {
        2: "Car",
        3: "Motorcycle",
        5: "Bus",
        7: "Truck"
    }

    # ========================================================
    # FRAME PROCESSING
    # ========================================================

    while cap.isOpened():

        ret, frame = cap.read()

        if not ret:
            break

        current_time = frame_idx / fps

        lat, lon = route_sim.get_coordinate_for_time(current_time)

        vehicle_count = 0
        events_to_send = []

        # ----------------------------------------------------
        # YOLO TRACKING
        # ----------------------------------------------------

        results = model.track(
            frame,
            persist=True,
            verbose=False
        )

        for r in results:

            boxes = r.boxes

            if boxes is None:
                continue

            for i, box in enumerate(boxes):

                cls_id = int(box.cls[0])
                conf = float(box.conf[0])

                # ------------------------------------------------
                # VEHICLE DETECTION
                # ------------------------------------------------

                is_vehicle = cls_id in [2, 3, 5, 7]

                if not is_vehicle:
                    continue

                vehicle_count += 1

                x1, y1, x2, y2 = map(
                    int,
                    box.xyxy[0]
                )

                # ------------------------------------------------
                # TRACK ID
                # ------------------------------------------------

                if boxes.id is not None:
                    track_id = int(boxes.id[i])
                else:
                    track_id = -1

                # ------------------------------------------------
                # CENTER POINT
                # ------------------------------------------------

                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)

                # ------------------------------------------------
                # RASH DRIVING CHECK
                # ------------------------------------------------

                rash_detected = False

                if track_id != -1:

                    history = track_history[track_id]

                    history.append((cx, cy))

                    if len(history) > 5:
                        history.pop(0)

                    if len(history) >= 2:

                        prev_cx, prev_cy = history[-2]

                        displacement = math.sqrt(
                            (cx - prev_cx) ** 2 +
                            (cy - prev_cy) ** 2
                        )

                        if displacement > RASH_DRIVING_DISPLACEMENT_THRESHOLD:

                            if current_time - last_rash_time[track_id] > 3:

                                rash_detected = True

                                events_to_send.append({
                                    "lat": lat,
                                    "lon": lon,
                                    "severity": "high",
                                    "event_type": "Rash Driving",
                                    "image_data": encode_image(frame)
                                })

                                last_rash_time[track_id] = current_time

                # ------------------------------------------------
                # DRAW VEHICLE BOX
                # ------------------------------------------------

                if rash_detected:
                    box_color = (0, 165, 255)
                    label = "RASH DRIVING"
                else:
                    box_color = (255, 0, 0)

                    vehicle_name = class_names.get(
                        cls_id,
                        "Vehicle"
                    )

                    label = f"{vehicle_name} {conf:.2f}"

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    box_color,
                    3
                )

                # Label background
                cv2.rectangle(
                    frame,
                    (x1, max(0, y1 - 30)),
                    (x1 + 180, y1),
                    box_color,
                    -1
                )

                cv2.putText(
                    frame,
                    label,
                    (x1 + 5, y1 - 8),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (255, 255, 255),
                    2
                )

                # Track ID
                if track_id != -1:

                    cv2.putText(
                        frame,
                        f"ID: {track_id}",
                        (x1, y2 + 20),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (255, 255, 255),
                        2
                    )

        # ====================================================
        # SIMULATED POTHOLE
        # ====================================================

        if current_time - last_defect_time > 10 and frame_idx > 15:

            px1 = int(width / 2) - 40
            py1 = int(height - 120)

            px2 = int(width / 2) + 40
            py2 = int(height - 60)

            cv2.rectangle(
                frame,
                (px1, py1),
                (px2, py2),
                (0, 0, 255),
                4
            )

            cv2.putText(
                frame,
                "POTHOLE",
                (px1 - 10, py1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2
            )

            events_to_send.append({
                "lat": lat,
                "lon": lon,
                "severity": "medium",
                "event_type": "Road Defect (Simulated)",
                "image_data": encode_image(frame)
            })

            last_defect_time = current_time

        # ====================================================
        # TRAFFIC CONGESTION
        # ====================================================

        traffic_detected = vehicle_count > TRAFFIC_DENSITY_THRESHOLD

        if traffic_detected:

            if current_time - last_traffic_time > 5:

                events_to_send.append({
                    "lat": lat,
                    "lon": lon,
                    "severity": "low",
                    "event_type": "Traffic Congestion",
                    "image_data": encode_image(frame)
                })

                last_traffic_time = current_time

        # ====================================================
        # INFORMATION PANEL
        # ====================================================

        panel_height = 145

        overlay = frame.copy()

        cv2.rectangle(
            overlay,
            (0, 0),
            (520, panel_height),
            (0, 0, 0),
            -1
        )

        frame = cv2.addWeighted(
            overlay,
            0.65,
            frame,
            0.35,
            0
        )

        cv2.putText(
            frame,
            "BUSENSE - EDGE AI",
            (15, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.85,
            (255, 255, 255),
            2
        )

        cv2.putText(
            frame,
            f"Vehicles Detected: {vehicle_count}",
            (15, 60),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (255, 255, 255),
            2
        )

        cv2.putText(
            frame,
            f"GPS: {lat:.5f}, {lon:.5f}",
            (15, 88),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2
        )

        cv2.putText(
            frame,
            f"Time: {current_time:.1f}s",
            (15, 115),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2
        )

        if traffic_detected:

            cv2.putText(
                frame,
                "TRAFFIC CONGESTION",
                (300, 115),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 165, 255),
                2
            )

        # ====================================================
        # SEND EVENTS TO BACKEND
        # ====================================================

        for payload in events_to_send:

            print(
                f"Event: {payload['event_type']} "
                f"at {current_time:.2f}s "
                f"(Lat/Lon: {lat:.4f}, {lon:.4f})"
            )

            try:

                requests.post(
                    BACKEND_URL,
                    json=payload,
                    timeout=2
                )

            except Exception:
                pass

        # ====================================================
        # SAVE FRAME
        # ====================================================

        out.write(frame)

        frame_idx += 1

        # Progress
        if frame_idx % 100 == 0:

            progress = (
                frame_idx / frame_count
            ) * 100 if frame_count > 0 else 0

            print(
                f"Processing: {progress:.1f}%"
            )

    # ========================================================
    # CLEANUP
    # ========================================================

    cap.release()
    out.release()

    print()
    print("==========================================")
    print("INFERENCE COMPLETE")
    print("==========================================")
    print(f"Output saved as: {OUTPUT_PATH}")
    print("")


if __name__ == "__main__":
    main()