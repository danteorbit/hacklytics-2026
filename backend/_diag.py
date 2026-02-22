"""Quick diagnostic for parking_processor on num_8.jpg"""

import sys, os

sys.path.insert(0, os.path.dirname(__file__))
import cv2, numpy as np
from snappark import ParkingPredictor
from parking_processor import _detect_parking_lines, estimate_gsd

p = ParkingPredictor("models/segformer-epoch=11-val_loss=0.17.ckpt")
img_bgr = cv2.imread("../batch_images_input/num_8.jpg")
h, w = img_bgr.shape[:2]
print(f"Image size: {w}x{h}")

pil_mask = p.predict("../batch_images_input/num_8.jpg")
mask_arr = np.array(pil_mask)
if mask_arr.ndim == 3:
    mask_gray = cv2.cvtColor(mask_arr, cv2.COLOR_RGB2GRAY)
else:
    mask_gray = mask_arr
mask_gray = mask_gray.astype(np.uint8)
if mask_gray.shape[:2] != (h, w):
    mask_gray = cv2.resize(mask_gray, (w, h), interpolation=cv2.INTER_NEAREST)

_, binary = cv2.threshold(mask_gray, 127, 255, cv2.THRESH_BINARY)
total_mask_px = np.count_nonzero(binary)
print(f"Total mask pixels: {total_mask_px} ({100*total_mask_px/(h*w):.1f}% of image)")

contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
print(f"Contours found: {len(contours)}")
for i, c in enumerate(sorted(contours, key=cv2.contourArea, reverse=True)[:5]):
    area = cv2.contourArea(c)
    x, y, bw, bh = cv2.boundingRect(c)
    print(f"  C{i}: area={area:.0f}px^2, bbox={bw}x{bh} at ({x},{y})")

angle, spacing = _detect_parking_lines(img_bgr, binary)
print(
    f'Lines: angle={None if angle is None else f"{np.degrees(angle):.1f}"}, spacing={spacing}'
)
gsd = estimate_gsd(img_bgr, binary)
spot_w_px = 8.5 / gsd
spot_l_px = 18.0 / gsd
print(f"GSD={gsd:.4f}, spot_w={spot_w_px:.1f}px, spot_l={spot_l_px:.1f}px")
print(f"Mask area @ GSD: {total_mask_px * gsd**2:.0f} sqft")

erode_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
eroded = cv2.erode(binary, erode_k, iterations=1)
eroded_px = np.count_nonzero(eroded)
print(
    f"After erosion: {eroded_px}px ({100*eroded_px/(h*w):.1f}%), lost {total_mask_px - eroded_px}px ({100*(1-eroded_px/max(1,total_mask_px)):.0f}%)"
)

contours2, _ = cv2.findContours(eroded, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
min_area = spot_w_px * spot_l_px * 3
print(f"After erosion: {len(contours2)} contours, min_area filter={min_area:.0f}px^2")
valid = [c for c in contours2 if cv2.contourArea(c) >= min_area]
print(f"Valid contours after filter: {len(valid)}")
for i, c in enumerate(valid):
    area = cv2.contourArea(c)
    x, y, bw, bh = cv2.boundingRect(c)
    print(
        f"  Valid C{i}: area={area:.0f}px^2, bbox={bw}x{bh}, area_sqft={area*gsd**2:.0f}"
    )
