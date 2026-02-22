"""Test the new CV-based GSD estimation pipeline."""
import cv2
import numpy as np
import os
import time
from snappark import ParkingPredictor
from parking_processor import (
    estimate_gsd_cv, _estimate_gsd_area_fallback,
    estimate_gsd, process_parking_image_civil,
    GSD_DEFAULT,
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "segformer-epoch=11-val_loss=0.17.ckpt")
INPUT_DIR = "../batch_images_input"
OUTPUT_DIR = "../batch_images_output"

print("=== Loading model ===")
t0 = time.time()
predictor = ParkingPredictor(MODEL_PATH)
print(f"Model loaded in {time.time()-t0:.1f}s\n")


def get_mask(img_path):
    img = cv2.imread(img_path)
    h, w = img.shape[:2]
    pil_mask = predictor.predict(img_path)
    mask_arr = np.array(pil_mask)
    if mask_arr.ndim == 3:
        mg = cv2.cvtColor(mask_arr, cv2.COLOR_RGB2GRAY) if mask_arr.shape[2] == 3 else cv2.cvtColor(mask_arr, cv2.COLOR_RGBA2GRAY)
    else:
        mg = mask_arr
    mg = mg.astype(np.uint8)
    hm, wm = mg.shape[:2]
    if (h, w) != (hm, wm):
        mg = cv2.resize(mg, (w, h), interpolation=cv2.INTER_NEAREST)
    _, binary = cv2.threshold(mg, 127, 255, cv2.THRESH_BINARY)
    return img, binary


test_images = ["8.jpg", "10.jpg", "5.jpg", "1.jpg"]

for fname in test_images:
    path = os.path.join(INPUT_DIR, fname)
    if not os.path.exists(path):
        print(f"\nSkipping {fname} (not found)")
        continue

    print(f"\n{'='*60}")
    print(f"  Testing: {fname}")
    print(f"{'='*60}")

    img, mask = get_mask(path)
    h, w = img.shape[:2]
    print(f"Image: {w}x{h}, mask nonzero: {np.count_nonzero(mask)}")

    # Test the new CV-based GSD
    gsd_cv = estimate_gsd_cv(img, mask)
    # Test the area fallback for comparison
    gsd_area = _estimate_gsd_area_fallback(mask)
    print(f"\n  >>> CV GSD:   {gsd_cv:.4f} ft/px")
    print(f"  >>> Area GSD: {gsd_area:.4f} ft/px")

    # Full pipeline
    print(f"\n--- Full pipeline with new GSD ---")
    annotated, spots, vehicles, open_s = process_parking_image_civil(
        img, cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)[:, :, 0] if mask.ndim == 2 else mask,
        gsd_ft_px=0.5, auto_gsd=True
    )
    print(f"  RESULT: {spots} spots, {vehicles}, {open_s} open")

    out_path = os.path.join(OUTPUT_DIR, f"gsd_test_{fname}")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    cv2.imwrite(out_path, annotated)
    print(f"  Saved: {out_path}")
