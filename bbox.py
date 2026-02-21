from ultralytics import YOLO

def bbox(str: str):
    """Bounding box class for object detection."""
    model = YOLO("yolov8n-obb.pt")
    results = model(source=str, save =True, conf=0.5)

    for r in results:
        for box in r.boxes:
            # xyxy format: [x1, y1, x2, y2]
            x1, y1, x2, y2 = box.xyxy[0].tolist()
        
            width = x2 - x1
            height = y2 - y1
            area = width * height
    return area