import os
import cv2
import numpy as np
from scipy.stats import mode as scipy_mode
from snappark import ParkingPredictor

# ==========================================
# 1. HELPER FUNCTIONS & GSD
# ==========================================

# Standard US parking dimensions (feet)
STD_SPOT_W_FT = 8.5  # spot width
STD_SPOT_L_FT = 18.0  # spot length (perpendicular parking)
STD_CAR_W_FT = 6.0  # average car width
STD_CAR_L_FT = 15.0  # average car length
STD_AISLE_FT = 24.0  # two-way aisle width

# A double-loaded row = 2 × spot_length + 1 × aisle = 60 ft deep, Nw spots wide
# Effective area per spot ≈ spot_w × (spot_l + aisle/2) = 8.5 × 30 ≈ 255 sqft
# Use a slightly higher number to account for landscaping, edges, etc.
SQFT_PER_SPOT = 280  # empirical average including half-aisle share

# Reasonable GSD bounds for aerial/satellite imagery (ft per pixel)
GSD_MIN = 0.05
GSD_MAX = 3.0
GSD_DEFAULT = 0.5


def _detect_parking_lines(img_bgr, mask):
    """
    Detect dominant parking-stripe angle and spacing from the ROI.
    Returns (angle_rad, spacing_px) or (None, None) on failure.
    """
    roi = cv2.bitwise_and(img_bgr, img_bgr, mask=mask)
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    edges = cv2.Canny(enhanced, 40, 120)

    # Mask edges to ROI only
    edges = cv2.bitwise_and(edges, edges, mask=mask)

    lines = cv2.HoughLinesP(
        edges, rho=1, theta=np.pi / 180, threshold=30, minLineLength=15, maxLineGap=8
    )
    if lines is None or len(lines) < 3:
        return None, None

    # Compute angles (0-180 range)
    angles = []
    lengths = []
    for l in lines:
        x1, y1, x2, y2 = l[0]
        length = np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1)) % 180
        angles.append(angle)
        lengths.append(length)

    angles = np.array(angles)
    lengths = np.array(lengths)

    # Weight by line length — longer lines are more reliable
    angle_bins = np.round(angles).astype(int)
    weighted_hist = np.zeros(180)
    for a, l in zip(angle_bins, lengths):
        weighted_hist[a % 180] += l

    # Find dominant angle (check +/- 3 degree window)
    best_angle = 0
    best_score = 0
    for deg in range(180):
        score = sum(weighted_hist[(deg + d) % 180] for d in range(-3, 4))
        if score > best_score:
            best_score = score
            best_angle = deg

    dominant_angle_deg = best_angle
    dominant_angle_rad = np.radians(dominant_angle_deg)

    # Compute perpendicular distances of lines near the dominant angle
    # to find the stripe spacing
    perp_dir = np.array(
        [np.cos(dominant_angle_rad + np.pi / 2), np.sin(dominant_angle_rad + np.pi / 2)]
    )
    projections = []
    for l in lines:
        x1, y1, x2, y2 = l[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1)) % 180
        diff = abs(angle - dominant_angle_deg)
        if diff > 90:
            diff = 180 - diff
        if diff < 8:
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            proj = mx * perp_dir[0] + my * perp_dir[1]
            projections.append(proj)

    if len(projections) < 3:
        return np.radians(dominant_angle_deg), None

    projections = np.sort(projections)
    diffs = np.diff(projections)
    # Filter out very small diffs (duplicate lines) and very large ones
    valid_diffs = diffs[(diffs > 5) & (diffs < 200)]

    if len(valid_diffs) < 2:
        return np.radians(dominant_angle_deg), None

    spacing_px = np.median(valid_diffs)
    return np.radians(dominant_angle_deg), spacing_px


def estimate_gsd(img_bgr, mask, expected_spots_hint=None, fallback=GSD_DEFAULT):
    """
    Estimate ground sampling distance (ft/px).

    Strategy:
      1) Try line-spacing detection — but validate that the implied spot size
         is reasonable relative to the mask blobs.  A single parking spot
         shouldn't dominate the blob.
      2) Fallback: geometry-based estimate from the mask bounding rectangle
         and the assumption that the narrow dimension spans N double-loaded
         parking rows (each ~60 ft deep).
    """
    _, spacing_px = _detect_parking_lines(img_bgr, mask)
    if spacing_px is not None and spacing_px > 0:
        gsd_candidate = STD_SPOT_W_FT / spacing_px

        # Sanity check: at this GSD, how big is a spot vs the mask blobs?
        spot_l_px = STD_SPOT_L_FT / gsd_candidate
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            biggest = max(contours, key=cv2.contourArea)
            _, (rw, rh) = cv2.minAreaRect(biggest)[:2]
            narrow = min(rw, rh)
            # If a single spot length would be > 40% of the blob's narrow
            # dimension, the spacing detection is probably picking up row
            # edges, not individual stripe widths — reject it.
            if narrow > 0 and (spot_l_px / narrow) > 0.40:
                print(
                    f"[GSD] Line spacing {spacing_px:.1f}px rejected: "
                    f"spot_l={spot_l_px:.0f}px vs blob narrow={narrow:.0f}px"
                )
            else:
                gsd = float(np.clip(gsd_candidate, GSD_MIN, GSD_MAX))
                print(
                    f"[GSD] Estimated from line spacing: {spacing_px:.1f} px "
                    f"=> GSD={gsd:.3f} ft/px"
                )
                return gsd

    # ── Area-based fallback ──────────────────────────────────────────────
    # Use the LARGEST individual blob's bounding rectangle (not all blobs
    # combined, which can span the entire image for multi-blob masks).
    mask_area_px = np.count_nonzero(mask)
    if mask_area_px > 0:
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            print(f"[GSD] Using hard fallback GSD={fallback:.3f} ft/px")
            return fallback

        # Use the largest blob for dimension estimation
        biggest = max(contours, key=cv2.contourArea)
        rect = cv2.minAreaRect(biggest)
        rect_w, rect_h = rect[1]
        narrow_px = min(rect_w, rect_h)
        wide_px = max(rect_w, rect_h)
        if narrow_px < 1:
            narrow_px = 1

        # Double-loaded row depth = 2×18 + 24 = 60 ft
        ROW_DEPTH_FT = 2 * STD_SPOT_L_FT + STD_AISLE_FT  # 60 ft
        # Real lots have fire lanes / curbs / drive aisles at perimeter
        EDGE_BUFFER_FT = 10  # ~5 ft on each side

        # Estimate number of double-loaded rows from aspect ratio
        aspect = wide_px / narrow_px
        if aspect > 3:
            n_rows = 1
        elif aspect > 1.5:
            n_rows = 2
        else:
            # Square-ish lot: estimate rows more carefully
            n_rows = max(1, min(4, round(narrow_px / wide_px * aspect + 0.5)))

        est_narrow_ft = n_rows * ROW_DEPTH_FT + EDGE_BUFFER_FT
        gsd = est_narrow_ft / narrow_px

        # Cross-check: at this GSD, how many spots would the total mask
        # area produce?  If < 5, the GSD is probably too low (spots too
        # big).  Increase n_rows to compensate.
        est_spots = mask_area_px * gsd * gsd / SQFT_PER_SPOT
        while est_spots < 10 and n_rows < 6:
            n_rows += 1
            est_narrow_ft = n_rows * ROW_DEPTH_FT
            gsd = est_narrow_ft / narrow_px
            est_spots = mask_area_px * gsd * gsd / SQFT_PER_SPOT

        gsd = float(np.clip(gsd, GSD_MIN, GSD_MAX))
        print(
            f"[GSD] Area-based fallback: blob_narrow={narrow_px:.0f}px, "
            f"blob_wide={wide_px:.0f}px, n_rows={n_rows}, "
            f"est_depth={est_narrow_ft:.0f}ft => GSD={gsd:.3f} ft/px "
            f"(est_spots~{mask_area_px * gsd * gsd / SQFT_PER_SPOT:.0f})"
        )
        return gsd

    print(f"[GSD] Using hard fallback GSD={fallback:.3f} ft/px")
    return fallback


def detect_lot_angle(img_bgr, mask, contour):
    """
    Determine the best rotation angle for the parking grid.
    Priority: 1) detected parking lines, 2) minimum-area bounding rect.
    """
    line_angle, _ = _detect_parking_lines(img_bgr, mask)
    if line_angle is not None:
        print(f"[ANGLE] From parking lines: {np.degrees(line_angle):.1f}°")
        return line_angle

    # Fallback: minimum-area bounding rectangle
    rect = cv2.minAreaRect(contour)
    angle_deg = rect[2]
    w, h = rect[1]
    if w < h:
        angle_deg += 90
    angle_rad = np.radians(angle_deg)
    print(f"[ANGLE] From minAreaRect: {angle_deg:.1f}°")
    return angle_rad


# ==========================================
# 2. CIVIL ENGINEERING PARKING GRID
# ==========================================


class ParkingSpot:
    def __init__(self, cx, cy, spot_poly):
        self.cx = cx
        self.cy = cy
        self.spot_poly = spot_poly


class CivilParkingBlob:
    def __init__(self, blob_id, full_mask, blob_mask, contour, params, img_bgr):
        self.blob_id = blob_id
        self.full_mask = full_mask
        self.blob_mask = blob_mask
        self.contour = contour
        self.h, self.w = self.full_mask.shape
        self.img_bgr = img_bgr

        self.spot_w = params["spot_w"]
        self.spot_l = params["spot_l"]
        self.aisle_len = params["aisle_len"]
        self.gsd = params["gsd"]

        self.area_px = cv2.contourArea(self.contour)
        self.area_sqft = int(self.area_px * (self.gsd**2))

        self.confirmed_spots = []

    def process_layout(self):
        """Find the best grid placement by testing multiple angles and shifts."""
        angle_rad = detect_lot_angle(self.img_bgr, self.blob_mask, self.contour)

        # Also test the perpendicular angle (spots could face either way)
        candidate_angles = [angle_rad, angle_rad + np.pi / 2]

        # Use the bounding rect CENTER as origin so the grid extends
        # symmetrically in all directions regardless of angle
        x, y, bw, bh = cv2.boundingRect(self.contour)
        origin = np.array([x + bw / 2, y + bh / 2], dtype=float)

        best_spots = []

        for angle in candidate_angles:
            v_w = np.array([np.cos(angle), np.sin(angle)])
            v_l = np.array([-np.sin(angle), np.cos(angle)])

            max_dim = max(bw, bh)
            n_w = int(max_dim / self.spot_w) + 2
            n_l = int(max_dim / self.spot_l) + 2

            # Test grid shifts for phase alignment
            n_shifts = 5
            shifts_w = np.linspace(0, self.spot_w, n_shifts, endpoint=False)
            # For the length direction, shift over one full double-loaded cycle
            cycle = (2 * self.spot_l) + self.aisle_len
            shifts_l = np.linspace(0, cycle, n_shifts, endpoint=False)

            for sw in shifts_w:
                for sl in shifts_l:
                    test_origin = origin + sw * v_w + sl * v_l
                    spots = self._test_grid(test_origin, v_w, v_l, n_w, n_l)
                    if len(spots) > len(best_spots):
                        best_spots = spots

        self.confirmed_spots = best_spots

    def _test_grid(self, origin, v_w, v_l, n_w, n_l):
        """Test a specific grid placement and return valid spots."""
        valid_spots = []
        cycle_len = (2 * self.spot_l) + self.aisle_len

        for i in range(-n_w, n_w + 1):
            for j in range(-n_l, n_l + 1):
                # Double-loaded layout: two rows of spots separated by an aisle
                offset_w = i * self.spot_w
                cycle_idx = j // 2
                spot_in_cycle = j % 2
                offset_l = cycle_idx * cycle_len + spot_in_cycle * self.spot_l

                center = origin + offset_w * v_w + offset_l * v_l
                cx, cy = int(center[0]), int(center[1])

                if not (0 <= cx < self.w and 0 <= cy < self.h):
                    continue

                # Build the 4 corners of the spot rectangle
                hw = 0.5 * self.spot_w
                hl = 0.5 * self.spot_l
                corners = [
                    center - hw * v_w - hl * v_l,
                    center + hw * v_w - hl * v_l,
                    center + hw * v_w + hl * v_l,
                    center - hw * v_w + hl * v_l,
                ]
                spot_poly = np.array(corners, dtype=np.int32)

                # ── Fast containment: check center + 4 corners inside blob mask ──
                all_inside = True
                for pt in [center] + corners:
                    px, py = int(pt[0]), int(pt[1])
                    if not (0 <= px < self.w and 0 <= py < self.h):
                        all_inside = False
                        break
                    if self.blob_mask[py, px] == 0:
                        all_inside = False
                        break

                if all_inside:
                    valid_spots.append(ParkingSpot(cx, cy, spot_poly))
                    continue

                # ── Softer overlap check for edge spots: ≥70% inside mask ──
                # Only check if center is at least inside
                if not (0 <= cx < self.w and 0 <= cy < self.h):
                    continue
                if self.blob_mask[cy, cx] == 0:
                    continue

                spot_mask = np.zeros((self.h, self.w), dtype=np.uint8)
                cv2.fillPoly(spot_mask, [spot_poly], 255)
                overlap = cv2.bitwise_and(spot_mask, self.blob_mask)
                spot_area = np.count_nonzero(spot_mask)
                overlap_area = np.count_nonzero(overlap)
                if spot_area > 0 and (overlap_area / spot_area) >= 0.55:
                    valid_spots.append(ParkingSpot(cx, cy, spot_poly))

        return valid_spots

    def draw(self, canvas):
        """Draw the detected spots on the canvas."""
        # Draw contour outline
        cv2.drawContours(canvas, [self.contour], -1, (0, 255, 255), 2)

        # Semi-transparent overlay for each spot
        overlay = canvas.copy()
        for spot in self.confirmed_spots:
            cv2.fillPoly(overlay, [spot.spot_poly], (200, 120, 0))
            cv2.polylines(canvas, [spot.spot_poly], True, (0, 255, 0), 1)
        cv2.addWeighted(overlay, 0.25, canvas, 0.75, 0, canvas)

        # Re-draw outlines on top of blend
        for spot in self.confirmed_spots:
            cv2.polylines(canvas, [spot.spot_poly], True, (0, 255, 0), 1)

        # Label
        M = cv2.moments(self.contour)
        if M["m00"] != 0:
            bcx = int(M["m10"] / M["m00"])
            bcy = int(M["m01"] / M["m00"])
        else:
            bcx, bcy = self.w // 2, self.h // 2

        label = f"Lot {self.blob_id}: {len(self.confirmed_spots)} Spots | {self.area_sqft:,} sqft"
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(canvas, label, (bcx - 80, bcy), font, 0.55, (0, 0, 0), 4)
        cv2.putText(canvas, label, (bcx - 80, bcy), font, 0.55, (0, 255, 0), 2)


# ==========================================
# 3. MAIN PROCESSING FUNCTION
# ==========================================


def process_parking_image_civil(
    img_bgr, mask_gray, gsd_ft_px=GSD_DEFAULT, auto_gsd=True
):
    _, binary_mask = cv2.threshold(mask_gray, 127, 255, cv2.THRESH_BINARY)
    print(f"[CIVIL] mask nonzero={np.count_nonzero(binary_mask)}")

    # Skip erosion — SegFormer masks are already clean and erosion
    # removes valid edge pixels that reduce spot detection at boundaries.
    eroded_mask = binary_mask

    # GSD estimation
    active_gsd = gsd_ft_px
    if auto_gsd:
        active_gsd = estimate_gsd(img_bgr, eroded_mask, fallback=gsd_ft_px)
    print(f"[CIVIL] active_gsd={active_gsd:.4f} ft/px")

    px_per_ft = 1.0 / active_gsd
    params = {
        "spot_w": STD_SPOT_W_FT * px_per_ft,
        "spot_l": STD_SPOT_L_FT * px_per_ft,
        "aisle_len": STD_AISLE_FT * px_per_ft,
        "gsd": active_gsd,
    }
    print(f"[CIVIL] spot_w_px={params['spot_w']:.1f}, spot_l_px={params['spot_l']:.1f}")

    # Find parking lot contours
    contours, _ = cv2.findContours(
        eroded_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    # Filter out tiny contours — must fit at least 3 parking spots
    min_area = params["spot_w"] * params["spot_l"] * 3
    contours = [c for c in contours if cv2.contourArea(c) >= min_area]
    print(f"[CIVIL] {len(contours)} valid contours (min_area={min_area:.0f}px²)")

    result_img = img_bgr.copy()
    total_spots = 0

    for idx, contour in enumerate(contours):
        blob_id = idx + 1
        blob_mask = np.zeros_like(eroded_mask)
        cv2.drawContours(blob_mask, [contour], -1, 255, -1)

        blob = CivilParkingBlob(
            blob_id, eroded_mask, blob_mask, contour, params, img_bgr
        )
        blob.process_layout()
        blob.draw(result_img)

        n = len(blob.confirmed_spots)
        total_spots += n
        print(f"[CIVIL] Lot {blob_id}: area={blob.area_sqft:,} sqft, {n} spots")

    # Draw total count at top
    font = cv2.FONT_HERSHEY_SIMPLEX
    label = f"{total_spots} Parking Spots Detected."
    cv2.putText(result_img, label, (20, 40), font, 0.9, (0, 0, 0), 5)
    cv2.putText(result_img, label, (20, 40), font, 0.9, (0, 255, 255), 2)

    vehicle_counts = {"car": 0, "truck": 0, "semi": 0, "unknown": 0, "total": 0}
    open_spots = total_spots

    return result_img, total_spots, vehicle_counts, open_spots


# ==========================================
# 4. API WRAPPER FOR FRONTEND
# ==========================================


class ParkingLotAnalyzer:
    def __init__(self, model_path=None):
        """
        Initializes the predictor. Do this once when your server starts.
        """
        if model_path is None:
            model_path = os.path.join(
                os.path.dirname(__file__),
                "models",
                "segformer-epoch=11-val_loss=0.17.ckpt",
            )
        self.predictor = ParkingPredictor(model_path)

    def analyze_image(
        self, input_image_path, output_image_path, gsd_ft_px=GSD_DEFAULT, auto_gsd=True
    ):
        """
        Processes a single image, saves the annotated result, and returns the spot count.
        """
        img_bgr = cv2.imread(input_image_path)
        if img_bgr is None:
            raise ValueError(f"Could not read image at {input_image_path}")

        h_img, w_img = img_bgr.shape[:2]

        pil_mask = self.predictor.predict(input_image_path)
        mask_arr = np.array(pil_mask)

        if mask_arr.ndim == 3:
            if mask_arr.shape[2] == 4:
                mask_gray = cv2.cvtColor(mask_arr, cv2.COLOR_RGBA2GRAY)
            else:
                mask_gray = cv2.cvtColor(mask_arr, cv2.COLOR_RGB2GRAY)
        else:
            mask_gray = mask_arr

        mask_gray = mask_gray.astype(np.uint8)

        h_mask, w_mask = mask_gray.shape[:2]
        if (h_img, w_img) != (h_mask, w_mask):
            mask_gray = cv2.resize(
                mask_gray, (w_img, h_img), interpolation=cv2.INTER_NEAREST
            )

        annotated_img, total_spots = process_parking_image_civil(
            img_bgr, mask_gray, gsd_ft_px=gsd_ft_px, auto_gsd=auto_gsd
        )

        os.makedirs(os.path.dirname(output_image_path) or ".", exist_ok=True)
        cv2.imwrite(output_image_path, annotated_img)

        return {"total_spots": total_spots, "output_image_path": output_image_path}
