import os
import cv2
import numpy as np
from scipy.stats import mode as scipy_mode
from snappark import ParkingPredictor

# ==========================================
# 1. HELPER FUNCTIONS & GSD
# ==========================================


def _is_parking_surface(img_bgr, blob_mask, min_edge_ratio=0.02, min_std=18):
    """
    Determine whether a blob is likely real parking (cars, lane markings,
    varied texture) vs. a building roof / uniform surface.

    Uses two complementary signals:
      1) Edge density  – Canny edges inside the blob as a fraction of blob area.
         Parking lots have lane markings, car outlines → high edge ratio.
         Roofs are smooth → very low edge ratio.
      2) Intensity std-dev – std of grayscale pixels inside the blob.
         Parking lots are heterogeneous → high std.
         Roofs are uniform → low std.

    Returns True if the blob looks like a real parking surface.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Compute stats only inside the blob
    pixels = gray[blob_mask > 0]
    if len(pixels) == 0:
        return False
    std_val = float(np.std(pixels))

    # Edge density
    edges = cv2.Canny(gray, 50, 150)
    edges_in_blob = cv2.bitwise_and(edges, edges, mask=blob_mask)
    edge_pixels = np.count_nonzero(edges_in_blob)
    blob_area = np.count_nonzero(blob_mask)
    edge_ratio = edge_pixels / max(blob_area, 1)

    is_parking = (edge_ratio >= min_edge_ratio) or (std_val >= min_std)
    print(
        f"[TEXTURE] std={std_val:.1f}, edge_ratio={edge_ratio:.4f} "
        f"=> {'PARKING' if is_parking else 'ROOF/BUILDING (skipped)'}"
    )
    return is_parking


def _remove_smooth_regions(img_bgr, mask, window=31, std_thresh=12):
    """
    Remove uniform/smooth regions from the mask using local texture analysis.

    Building roofs appear as large smooth areas from above, while real
    parking lots have cars, lane markings, shadows, etc. that create local
    variance.

    Strategy:
      1) Compute local standard deviation in a sliding window.
      2) Threshold to identify "textured" pixels.
      3) AND with the original mask to keep only textured areas.
      4) Morphological cleanup to remove small noise patches and fill gaps
         in legitimate parking areas.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)

    # Local mean and local mean-of-squares → local variance
    ksize = window
    local_mean = cv2.blur(gray, (ksize, ksize))
    local_sq_mean = cv2.blur(gray * gray, (ksize, ksize))
    local_var = local_sq_mean - local_mean * local_mean
    local_std = np.sqrt(np.maximum(local_var, 0))

    # Binary texture mask: 1 where texture is high enough
    textured = (local_std >= std_thresh).astype(np.uint8) * 255

    # Also add edge-dense regions (catch lane markings even in low-
    # variance areas like empty asphalt)
    edges = cv2.Canny(gray.astype(np.uint8), 50, 150)
    # Dilate edges so they fill out to spot-sized regions
    edge_dilated = cv2.dilate(edges, np.ones((window, window), np.uint8))
    textured = cv2.bitwise_or(textured, edge_dilated)

    # AND with the original SegFormer mask
    refined = cv2.bitwise_and(mask, textured)

    # Morphological cleanup: close small gaps, then remove tiny fragments
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    refined = cv2.morphologyEx(refined, cv2.MORPH_CLOSE, kernel_close)
    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    refined = cv2.morphologyEx(refined, cv2.MORPH_OPEN, kernel_open)

    before_nz = np.count_nonzero(mask)
    after_nz = np.count_nonzero(refined)
    removed_pct = (1 - after_nz / max(before_nz, 1)) * 100
    print(
        f"[TEXTURE] Smooth-region removal: {before_nz}->{after_nz} px "
        f"({removed_pct:.1f}% removed, window={window}, std_thresh={std_thresh})"
    )
    return refined


# ==========================================
# 1b. VEHICLE DETECTION (BW + ASPECT RATIO)
# ==========================================

# Typical top-down vehicle dimensions (feet)
VEHICLE_TYPES = {
    "car": {
        "w_ft": (5.0, 7.0),
        "l_ft": (12.0, 17.0),
        "ratio": (1.6, 3.0),
        "color": (0, 255, 0),
    },
    "truck": {
        "w_ft": (6.0, 8.5),
        "l_ft": (17.0, 24.0),
        "ratio": (2.2, 3.8),
        "color": (0, 200, 255),
    },
    "semi": {
        "w_ft": (8.0, 10.0),
        "l_ft": (40.0, 75.0),
        "ratio": (4.5, 10.0),
        "color": (0, 0, 255),
    },
}


def _normalize_angle(angle_deg, rw, rh):
    """
    Return the orientation of the *long axis* of a minAreaRect in [0, 180).
    OpenCV's minAreaRect angle convention is inconsistent across versions,
    so we normalise: the angle of the longer side, mapped to 0‒180°.
    """
    if rw < rh:
        angle_deg += 90.0
    return angle_deg % 180.0


def _find_dominant_angle(candidates, angle_tol=15.0):
    """
    Given a list of (angle_deg, weight) pairs, find the single dominant
    parking direction.  Vehicles in a lot are (mostly) parked parallel,
    so we pick the angle with the most weighted votes in a ±angle_tol
    window.  Returns dominant_angle in [0, 180) or None.
    """
    if not candidates:
        return None

    angles = np.array([a for a, _ in candidates])
    weights = np.array([w for _, w in candidates])

    # Circular histogram (1° bins, angles wrap at 180°)
    hist = np.zeros(180, dtype=float)
    for a, w in zip(angles, weights):
        hist[int(round(a)) % 180] += w

    # Sliding window of ±angle_tol — find peak
    best_score, best_bin = 0.0, 0
    win = int(round(angle_tol))
    for b in range(180):
        score = sum(hist[(b + d) % 180] for d in range(-win, win + 1))
        if score > best_score:
            best_score = score
            best_bin = b

    # Weighted mean of angles that fall inside the winning window
    in_window = []
    for a, w in zip(angles, weights):
        diff = abs(a - best_bin)
        if diff > 90:
            diff = 180 - diff  # handle wrap-around
        if diff <= angle_tol:
            in_window.append((a, w))

    if not in_window:
        return None

    # Circular weighted mean (use 2× angle trick to handle 0/180 wrap)
    sins = sum(w * np.sin(np.radians(2 * a)) for a, w in in_window)
    coss = sum(w * np.cos(np.radians(2 * a)) for a, w in in_window)
    dom_angle = (np.degrees(np.arctan2(sins, coss)) / 2.0) % 180.0

    print(f"[VEHICLES] Dominant parking angle: {dom_angle:.1f}°")
    return dom_angle


def detect_vehicles(img_bgr, parking_mask, gsd_ft_px):
    """
    Detect and classify vehicles in parking areas using BW thresholding,
    dominant-orientation tiling, dimensional consistency, and strict size
    hierarchy enforcement (car < truck < semi).

    Pipeline
    --------
    1) Adaptive threshold → dark objects on lighter pavement.
    2) Find contours → candidate bounding rects.
    3) **Dominant orientation** — find the most common long-axis angle
       among candidates.  Only keep detections aligned to it (±15°).
       Parked vehicles are parallel to each other.
    4) Initial classification by aspect ratio + absolute dimensions.
    5) **Dimensional consistency** — within each class, reject outliers
       whose width or length deviates > 1.5 MAD from the class median.
       E.g. all "cars" should be roughly the same size.
    6) **Size hierarchy** — enforce car_area < truck_area < semi_area.
       If a car is bigger than the median truck, reclassify or drop it.

    Returns
    -------
    vehicles : list[dict]   — keys: type, center, box_pts, w_ft, l_ft, angle
    counts   : dict          — {"car": N, "truck": N, "semi": N, "total": N}
    """
    px_per_ft = 1.0 / gsd_ft_px

    # Size bounds in pixels
    min_vehicle_area_ft2 = 5.0 * 10.0   # ~50  sqft (small car)
    max_vehicle_area_ft2 = 10.0 * 75.0  # ~750 sqft (long semi)
    min_area_px = min_vehicle_area_ft2 * (px_per_ft ** 2)
    max_area_px = max_vehicle_area_ft2 * (px_per_ft ** 2)

    # ── 1. Adaptive threshold ────────────────────────────────────────────
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    roi_gray = cv2.bitwise_and(gray, gray, mask=parking_mask)

    block_size = max(int(15 * px_per_ft) | 1, 3)
    if block_size % 2 == 0:
        block_size += 1
    bw = cv2.adaptiveThreshold(
        roi_gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        block_size, 8,
    )
    bw = cv2.bitwise_and(bw, parking_mask)

    k_close = max(int(1.5 * px_per_ft), 2)
    k_open  = max(int(0.5 * px_per_ft), 2)
    bw = cv2.morphologyEx(bw, cv2.MORPH_CLOSE, np.ones((k_close, k_close), np.uint8))
    bw = cv2.morphologyEx(bw, cv2.MORPH_OPEN,  np.ones((k_open, k_open), np.uint8))

    # ── 2. Find candidate bounding rects ─────────────────────────────────
    contours, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    raw = []  # list of dicts before filtering
    angle_votes = []  # (angle_deg, area) for dominant-orientation voting

    for cnt in contours:
        area_px = cv2.contourArea(cnt)
        if area_px < min_area_px or area_px > max_area_px:
            continue

        rect = cv2.minAreaRect(cnt)
        (cx, cy), (rw, rh), angle = rect
        if rw < 1 or rh < 1:
            continue

        w_px = min(rw, rh)
        l_px = max(rw, rh)
        w_ft = w_px * gsd_ft_px
        l_ft = l_px * gsd_ft_px
        ratio = l_ft / max(w_ft, 0.1)

        vtype = _classify_vehicle(w_ft, l_ft, ratio)
        if vtype is None:
            continue

        long_axis_angle = _normalize_angle(angle, rw, rh)
        box_pts = cv2.boxPoints(rect).astype(np.int32)

        raw.append({
            "type": vtype,
            "center": (int(cx), int(cy)),
            "box_pts": box_pts,
            "w_ft": round(w_ft, 1),
            "l_ft": round(l_ft, 1),
            "ratio": round(ratio, 2),
            "angle": round(long_axis_angle, 1),
            "area_ft2": round(w_ft * l_ft, 1),
        })
        angle_votes.append((long_axis_angle, w_ft * l_ft))

    # ── 3. Dominant orientation filter ───────────────────────────────────
    # Parked vehicles are parallel — keep only those within ±15° of the
    # dominant parking direction.
    ANGLE_TOL = 15.0
    dom_angle = _find_dominant_angle(angle_votes, angle_tol=ANGLE_TOL)

    if dom_angle is not None:
        aligned = []
        for v in raw:
            diff = abs(v["angle"] - dom_angle)
            if diff > 90:
                diff = 180 - diff
            if diff <= ANGLE_TOL:
                aligned.append(v)
        dropped = len(raw) - len(aligned)
        if dropped:
            print(f"[VEHICLES] Orientation filter: kept {len(aligned)}, "
                  f"dropped {dropped} not aligned to {dom_angle:.1f}°")
        raw = aligned

    # ── 4. Dimensional consistency ───────────────────────────────────────
    # Within each vehicle class, reject outliers.  All "cars" should be
    # roughly the same size; same for trucks, same for semis.
    # Use median ± 1.5×MAD for width and length independently.
    for vtype in ("car", "truck", "semi"):
        group = [v for v in raw if v["type"] == vtype]
        if len(group) < 3:
            continue  # too few to compute robust stats

        widths  = np.array([v["w_ft"] for v in group])
        lengths = np.array([v["l_ft"] for v in group])

        w_med = np.median(widths)
        l_med = np.median(lengths)
        w_mad = max(np.median(np.abs(widths  - w_med)), 0.5)  # floor at 0.5 ft
        l_mad = max(np.median(np.abs(lengths - l_med)), 0.5)

        kept_ids = set()
        for v in group:
            w_ok = abs(v["w_ft"] - w_med) <= 1.5 * w_mad
            l_ok = abs(v["l_ft"] - l_med) <= 1.5 * l_mad
            if w_ok and l_ok:
                kept_ids.add(id(v))

        before = len(group)
        raw = [v for v in raw if v["type"] != vtype or id(v) in kept_ids]
        after = sum(1 for v in raw if v["type"] == vtype)
        if before != after:
            print(f"[VEHICLES] Consistency filter ({vtype}): "
                  f"{before} -> {after} (med w={w_med:.1f}, l={l_med:.1f})")

    # ── 5. Size hierarchy enforcement ────────────────────────────────────
    # car_area < truck_area < semi_area.  Compute median area per class,
    # then reclassify or drop any vehicle that violates the ordering.
    def _median_area(vtype):
        areas = [v["area_ft2"] for v in raw if v["type"] == vtype]
        return np.median(areas) if areas else None

    med_car  = _median_area("car")
    med_truck = _median_area("truck")
    med_semi = _median_area("semi")

    hierarchy_fixed = []
    for v in raw:
        area = v["area_ft2"]
        vt = v["type"]

        # Car must not be larger than median truck
        if vt == "car" and med_truck is not None and area > med_truck * 1.1:
            # Try reclassifying as truck
            if med_semi is None or area <= med_semi * 1.1:
                v = {**v, "type": "truck"}
            else:
                continue  # too big even for truck — drop

        # Truck must not be larger than median semi
        if vt == "truck" and med_semi is not None and area > med_semi * 1.1:
            v = {**v, "type": "semi"}

        # Truck must not be smaller than median car
        if vt == "truck" and med_car is not None and area < med_car * 0.9:
            v = {**v, "type": "car"}

        # Semi must not be smaller than median truck
        if vt == "semi" and med_truck is not None and area < med_truck * 0.9:
            v = {**v, "type": "truck"}

        hierarchy_fixed.append(v)

    raw = hierarchy_fixed

    # ── Build final result ───────────────────────────────────────────────
    vehicles = raw
    counts = {"car": 0, "truck": 0, "semi": 0, "unknown": 0, "total": 0}
    for v in vehicles:
        counts[v["type"]] = counts.get(v["type"], 0) + 1
        counts["total"] += 1

    print(
        f"[VEHICLES] Detected {counts['total']} vehicles: "
        f"{counts['car']} cars, {counts['truck']} trucks, {counts['semi']} semis"
    )
    return vehicles, counts


def _classify_vehicle(w_ft, l_ft, ratio):
    """Classify a bounding box as car, truck, or semi using best-fit scoring.

    Scores each vehicle type by how close the object's dimensions are to the
    centre of that type's expected ranges.  The type with the lowest normalised
    distance wins, provided the object is within the toleranced envelope.
    """
    best_type = None
    best_score = float("inf")

    for vtype, spec in VEHICLE_TYPES.items():
        r_lo, r_hi = spec["ratio"]
        w_lo, w_hi = spec["w_ft"]
        l_lo, l_hi = spec["l_ft"]

        # Must be within the toleranced envelope (±30%)
        in_ratio  = r_lo * 0.7 <= ratio <= r_hi * 1.3
        in_width  = w_lo * 0.7 <= w_ft  <= w_hi * 1.3
        in_length = l_lo * 0.7 <= l_ft  <= l_hi * 1.3

        # Semi/truck require BOTH width AND length (distinctive shapes);
        # cars only need ratio + one dimension
        if vtype in ("semi", "truck"):
            if not (in_ratio and in_width and in_length):
                continue
        else:
            if not (in_ratio and (in_width or in_length)):
                continue

        # Score = sum of squared normalised deviations from each range centre
        r_mid = (r_lo + r_hi) / 2
        w_mid = (w_lo + w_hi) / 2
        l_mid = (l_lo + l_hi) / 2
        score = (
            ((ratio - r_mid) / max(r_hi - r_lo, 0.1)) ** 2
            + ((w_ft - w_mid) / max(w_hi - w_lo, 0.1)) ** 2
            + ((l_ft - l_mid) / max(l_hi - l_lo, 0.1)) ** 2
        )

        if score < best_score:
            best_score = score
            best_type = vtype

    if best_type is not None:
        return best_type

    # Fallback: reasonable ratio + reasonable dimensions → car
    if 1.3 <= ratio <= 4.0 and 4.0 <= w_ft <= 10.0 and 8.0 <= l_ft <= 25.0:
        return "car"

    return None


def draw_vehicles(canvas, vehicles):
    """Draw detected vehicles on the image with color-coded bounding boxes."""
    for v in vehicles:
        color = VEHICLE_TYPES.get(v["type"], {}).get("color", (128, 128, 128))
        cv2.drawContours(canvas, [v["box_pts"]], 0, color, 2)

        # Small label
        cx, cy = v["center"]
        label = v["type"][0].upper()  # C / T / S
        cv2.putText(
            canvas,
            label,
            (cx - 4, cy + 4),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.35,
            (0, 0, 0),
            2,
        )
        cv2.putText(
            canvas, label, (cx - 4, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1
        )


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


# ==========================================
# 1c. CV-BASED GSD ESTIMATION
# ==========================================
#
# Reference ground-truth dimensions used for calibration (feet).
# Each entry: (short_ft, long_ft, label) for the typical object when
# viewed from above.
_GSD_REFERENCES = [
    # Passenger parking spot (9 × 18 ft, US standard)
    {"short_ft": 9.0, "long_ft": 18.0, "label": "parking_spot",
     "ratio_lo": 1.6, "ratio_hi": 2.5},
    # Passenger car top-down silhouette
    {"short_ft": 6.0, "long_ft": 15.0, "label": "car",
     "ratio_lo": 1.8, "ratio_hi": 3.2},
    # Pickup truck / large SUV
    {"short_ft": 7.0, "long_ft": 20.0, "label": "truck",
     "ratio_lo": 2.2, "ratio_hi": 3.8},
    # Semi-truck (tractor + trailer)
    {"short_ft": 12.0, "long_ft": 40.0, "label": "semi",
     "ratio_lo": 2.8, "ratio_hi": 5.0},
]


def _is_quad(approx):
    """Return True if *approx* is a 4-vertex convex or sheared polygon."""
    if len(approx) != 4:
        return False
    # Accept parallelograms: opposite sides should be roughly equal length
    pts = approx.reshape(4, 2).astype(float)
    sides = [np.linalg.norm(pts[(i + 1) % 4] - pts[i]) for i in range(4)]
    # Ratio of opposite sides should be close to 1 (within 60% tolerance to
    # accept perspective distortion and angled parking)
    r1 = min(sides[0], sides[2]) / max(sides[0], sides[2]) if max(sides[0], sides[2]) > 0 else 0
    r2 = min(sides[1], sides[3]) / max(sides[1], sides[3]) if max(sides[1], sides[3]) > 0 else 0
    return r1 > 0.40 and r2 > 0.40


def _extract_quad_dims(approx):
    """Return (short_px, long_px) of a 4-vertex polygon using its min-area rect."""
    rect = cv2.minAreaRect(approx)
    rw, rh = rect[1]
    short_px = min(rw, rh)
    long_px = max(rw, rh)
    return short_px, long_px


def estimate_gsd_cv(img_bgr, mask, fallback=GSD_DEFAULT):
    """
    Dynamically calculate Ground Sample Distance by using computer vision
    to isolate and measure vehicles and painted parking spots against known
    real-world dimensions.

    Pipeline
    --------
    1) **Foreground Segmentation (Otsu)** -- threshold the parking ROI to
       separate bright objects (vehicles, painted lines) from dark asphalt.
    2) **Canny Edge Detection** -- extract sharp boundaries of cars and
       spot markings.
    3) **Contour Detection + Polygon Approximation** -- find closed shapes,
       keep only 4-vertex polygons (rectangles / parallelograms).
    4) **Sheared-Rectangle Acceptance** -- accept parallelograms (angled
       parking, camera perspective).  Group quads by consistent aspect ratio.
    5) **Dimension Calibration** -- compare pixel dims against ground-truth
       references (9×18 ft spot, 6×15 ft car, 7×20 ft truck, 12×40 ft semi).
    6) **GSD Calculation** -- average the pixel-to-foot ratio across all
       matched shapes to produce a robust ft/px value.

    Returns
    -------
    gsd : float
        Ground Sample Distance in ft/px, clipped to [GSD_MIN, GSD_MAX].
    """
    # ── 0. Prepare the grayscale ROI ─────────────────────────────────────
    gray_full = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    roi_gray = cv2.bitwise_and(gray_full, gray_full, mask=mask)

    # ── 1. Foreground Segmentation (Otsu) ────────────────────────────────
    # Only threshold non-zero pixels (inside mask) to avoid the black
    # background biasing Otsu.
    roi_pixels = roi_gray[mask > 0]
    if len(roi_pixels) < 100:
        print(f"[GSD-CV] Too few mask pixels ({len(roi_pixels)}), using fallback")
        return fallback

    otsu_thresh, _ = cv2.threshold(roi_pixels, 0, 255, cv2.THRESH_OTSU)
    # Apply the computed threshold to the full ROI image
    _, fg_mask = cv2.threshold(roi_gray, int(otsu_thresh), 255, cv2.THRESH_BINARY)
    # Keep only within the parking mask
    fg_mask = cv2.bitwise_and(fg_mask, mask)

    # Light morphological cleanup -- close small gaps in stripe paint /
    # car bodies, then open to shed noise specks.
    k_close = np.ones((3, 3), np.uint8)
    k_open = np.ones((3, 3), np.uint8)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, k_close, iterations=2)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, k_open, iterations=1)

    print(
        f"[GSD-CV] Otsu thresh={otsu_thresh:.0f}, "
        f"fg_pixels={np.count_nonzero(fg_mask)}"
    )

    # ── 2. Canny Edge Detection ──────────────────────────────────────────
    blurred = cv2.GaussianBlur(roi_gray, (3, 3), 0)
    edges = cv2.Canny(blurred, int(otsu_thresh * 0.5), int(otsu_thresh))
    # Only keep edges inside the parking mask
    edges = cv2.bitwise_and(edges, mask)
    # Dilate edges slightly so nearby fragments connect into closed shapes
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)

    # ── 3. Contour Detection + Polygon Approximation ─────────────────────
    # Run contour detection on BOTH the foreground mask and the edge map,
    # then merge results so we catch solid-filled objects (fg_mask) AND
    # outline-only objects (edges).
    combined = cv2.bitwise_or(fg_mask, edges)
    # Close to merge nearby segments into full shapes
    combined = cv2.morphologyEx(
        combined, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2
    )

    contours, _ = cv2.findContours(
        combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    # Also find contours from JUST the foreground mask (more solid shapes)
    fg_contours, _ = cv2.findContours(
        fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    contours = list(contours) + list(fg_contours)

    # Minimum area filter: reject tiny noise and giant blobs that span
    # the whole parking lot (> 30% of mask area).  A meaningful parking
    # feature (one car or one spot) should occupy at least ~0.1% of the
    # lot mask area.  For a 512×512 image, 0.1% ≈ 260 px².
    mask_area = max(np.count_nonzero(mask), 1)
    max_blob_area = mask_area * 0.30
    min_blob_area = max(50, int(mask_area * 0.001))
    # Minimum short-side pixels: at any plausible GSD (0.1-2.0 ft/px) the
    # narrowest real-world reference (6 ft car width) is 3-60 px. We set
    # a floor of 6 px to reject noise while keeping real detections.
    MIN_SHORT_PX = 6

    quads = []  # list of (short_px, long_px, ratio, contour_approx)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_blob_area or area > max_blob_area:
            continue

        # Polygon approximation with adaptive epsilon
        peri = cv2.arcLength(cnt, True)
        # Try progressively tighter epsilon until we get <=6 vertices or
        # give up -- this handles both clean and noisy contours.
        approx = None
        for eps_frac in [0.04, 0.035, 0.03, 0.025, 0.02, 0.015]:
            candidate = cv2.approxPolyDP(cnt, eps_frac * peri, True)
            if len(candidate) == 4:
                approx = candidate
                break
            # Accept near-quads (5-6 vertices) if they look rectangular
            if len(candidate) in (5, 6):
                # Re-fit with min-area rect and test rectangularity
                rect = cv2.minAreaRect(candidate)
                box = cv2.boxPoints(rect).astype(np.int32)
                box_area = max(rect[1][0] * rect[1][1], 1)
                if area / box_area > 0.70:
                    approx = box.reshape(-1, 1, 2)
                    break

        if approx is None:
            continue

        # ── 4. Sheared-Rectangle Filter ──────────────────────────────────
        if not _is_quad(approx):
            continue

        short_px, long_px = _extract_quad_dims(approx)
        if short_px < MIN_SHORT_PX or long_px < MIN_SHORT_PX:
            continue
        ratio = long_px / short_px

        quads.append((short_px, long_px, ratio, approx))

    print(f"[GSD-CV] Found {len(quads)} rectangular quads from {len(contours)} contours")

    if len(quads) == 0:
        return _estimate_gsd_area_fallback(mask, fallback)

    # ── 5. Dimension Calibration ─────────────────────────────────────────
    # For each quad, try to match it against each reference object.
    # Compute a candidate GSD from both the short and long dimension,
    # then average them.
    gsd_votes = []  # list of (gsd_value, weight)

    for short_px, long_px, ratio, _ in quads:
        for ref in _GSD_REFERENCES:
            if not (ref["ratio_lo"] <= ratio <= ref["ratio_hi"]):
                continue

            # Two candidate GSDs: from the short side and from the long side
            gsd_short = ref["short_ft"] / short_px
            gsd_long = ref["long_ft"] / long_px

            # They should agree within ±40%; if not, this isn't a real match
            if max(gsd_short, gsd_long) > 0:
                agreement = min(gsd_short, gsd_long) / max(gsd_short, gsd_long)
            else:
                continue

            if agreement < 0.60:
                continue

            # Reject implausible GSD values before adding
            avg_gsd = (gsd_short + gsd_long) / 2.0
            if not (GSD_MIN <= avg_gsd <= GSD_MAX):
                continue

            # Weight by area (larger objects give more reliable GSD) and
            # by agreement quality
            weight = (short_px * long_px) * agreement
            gsd_votes.append((avg_gsd, weight, ref["label"]))

    if len(gsd_votes) == 0:
        print("[GSD-CV] No quads matched references => area fallback")
        return _estimate_gsd_area_fallback(mask, fallback)

    # ── 6. GSD Calculation (weighted average) ────────────────────────────
    # Use a robust estimator: weighted median (resistant to outliers)
    gsd_vals = np.array([v[0] for v in gsd_votes])
    weights = np.array([v[1] for v in gsd_votes])

    # Weighted median
    sorted_idx = np.argsort(gsd_vals)
    gsd_sorted = gsd_vals[sorted_idx]
    w_sorted = weights[sorted_idx]
    cumw = np.cumsum(w_sorted)
    median_idx = np.searchsorted(cumw, cumw[-1] / 2.0)
    gsd_median = float(gsd_sorted[min(median_idx, len(gsd_sorted) - 1)])

    # Also compute weighted mean for comparison
    gsd_mean = float(np.average(gsd_vals, weights=weights))

    # Use the median (more robust) but sanity-check against the mean
    gsd_final = gsd_median
    if abs(gsd_median - gsd_mean) / max(gsd_mean, 0.01) > 0.5:
        # Large disagreement: fall back to mean (median may be an outlier)
        gsd_final = gsd_mean

    gsd_final = float(np.clip(gsd_final, GSD_MIN, GSD_MAX))

    # Log breakdown by reference type
    label_counts = {}
    for _, _, lbl in gsd_votes:
        label_counts[lbl] = label_counts.get(lbl, 0) + 1
    breakdown = ", ".join(f"{v} {k}" for k, v in sorted(label_counts.items()))

    print(
        f"[GSD-CV] {len(gsd_votes)} calibration matches ({breakdown}): "
        f"median={gsd_median:.4f}, mean={gsd_mean:.4f} => GSD={gsd_final:.4f} ft/px"
    )

    # ── Sanity check ─────────────────────────────────────────────────────
    # At the computed GSD, does the lot area yield a plausible number of
    # parking spots?  Real lots visible in aerial/satellite imagery of this
    # resolution typically have 15-500+ spots.  If the CV estimate implies
    # fewer than MIN_PLAUSIBLE_SPOTS, the detected quads were probably
    # spurious features rather than real vehicles / spots.
    MIN_PLAUSIBLE_SPOTS = 15
    est_spots_cv = mask_area * (gsd_final ** 2) / SQFT_PER_SPOT

    if est_spots_cv < MIN_PLAUSIBLE_SPOTS:
        gsd_area = _estimate_gsd_area_fallback(mask, fallback)
        est_spots_area = mask_area * (gsd_area ** 2) / SQFT_PER_SPOT

        if est_spots_area >= MIN_PLAUSIBLE_SPOTS:
            # Area-based is more plausible.  Blend: 30% CV / 70% area to
            # preserve any usable signal from the CV pipeline.
            BLEND_CV = 0.3
            gsd_blended = BLEND_CV * gsd_final + (1 - BLEND_CV) * gsd_area
            print(
                f"[GSD-CV] Sanity check: CV gives ~{est_spots_cv:.0f} spots "
                f"(need ≥{MIN_PLAUSIBLE_SPOTS}).  Blending {BLEND_CV:.0%} CV "
                f"+ {1 - BLEND_CV:.0%} area ({gsd_area:.4f}) => {gsd_blended:.4f}"
            )
            gsd_final = float(np.clip(gsd_blended, GSD_MIN, GSD_MAX))
        else:
            # Both methods give low counts -- use area-based (conservative)
            print(
                f"[GSD-CV] Sanity check: both CV (~{est_spots_cv:.0f}) and "
                f"area (~{est_spots_area:.0f}) give low spot counts. "
                f"Using area fallback {gsd_area:.4f}"
            )
            gsd_final = gsd_area
    else:
        print(f"[GSD-CV] Sanity check passed: ~{est_spots_cv:.0f} estimated spots")

    return gsd_final


def _estimate_gsd_area_fallback(mask, fallback=GSD_DEFAULT):
    """
    Area-based GSD fallback when the CV quad-matching pipeline finds no
    calibration matches.  Uses the largest blob's bounding rectangle and
    assumes the narrow dimension spans N double-loaded parking rows.
    """
    mask_area_px = np.count_nonzero(mask)
    if mask_area_px == 0:
        print(f"[GSD] Using hard fallback GSD={fallback:.3f} ft/px")
        return fallback

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        print(f"[GSD] Using hard fallback GSD={fallback:.3f} ft/px")
        return fallback

    biggest = max(contours, key=cv2.contourArea)
    rect = cv2.minAreaRect(biggest)
    rect_w, rect_h = rect[1]
    narrow_px = max(min(rect_w, rect_h), 1)
    wide_px = max(rect_w, rect_h)

    ROW_DEPTH_FT = 2 * STD_SPOT_L_FT + STD_AISLE_FT  # 60 ft
    EDGE_BUFFER_FT = 10

    aspect = wide_px / narrow_px
    if aspect > 3:
        n_rows = 1
    elif aspect > 1.5:
        n_rows = 2
    else:
        n_rows = max(1, min(4, round(narrow_px / wide_px * aspect + 0.5)))

    est_narrow_ft = n_rows * ROW_DEPTH_FT + EDGE_BUFFER_FT
    gsd = est_narrow_ft / narrow_px

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


def estimate_gsd(img_bgr, mask, expected_spots_hint=None, fallback=GSD_DEFAULT):
    """
    Estimate ground sampling distance (ft / px).

    Primary strategy: CV-based quad detection + calibration against known
    real-world object dimensions (estimate_gsd_cv).

    Falls back to area-based heuristic if the CV pipeline produces no
    calibration matches.
    """
    return estimate_gsd_cv(img_bgr, mask, fallback=fallback)


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

    # Remove smooth/uniform regions (building roofs) from the mask
    binary_mask = _remove_smooth_regions(img_bgr, binary_mask)

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

    # ── Vehicle detection (BW + aspect ratio) ──────────────────────────────
    vehicles, vehicle_counts = detect_vehicles(img_bgr, eroded_mask, active_gsd)
    draw_vehicles(result_img, vehicles)

    occupied = vehicle_counts["total"]
    open_spots = max(0, total_spots - occupied)

    # Draw total count at top
    font = cv2.FONT_HERSHEY_SIMPLEX
    h_img = img_bgr.shape[0]
    # Line 1: spots
    label1 = f"{total_spots} Parking Spots Detected."
    cv2.putText(result_img, label1, (20, 40), font, 0.9, (0, 0, 0), 5)
    cv2.putText(result_img, label1, (20, 40), font, 0.9, (0, 255, 255), 2)
    # Line 2: vehicles
    label2 = (
        f"Vehicles: {occupied} ({vehicle_counts['car']}C "
        f"{vehicle_counts['truck']}T {vehicle_counts['semi']}S) | "
        f"Open: {open_spots}"
    )
    cv2.putText(result_img, label2, (20, 75), font, 0.7, (0, 0, 0), 4)
    cv2.putText(result_img, label2, (20, 75), font, 0.7, (0, 255, 200), 2)

    # Legend at bottom
    y_leg = h_img - 20
    cv2.putText(result_img, "C=Car", (20, y_leg), font, 0.45, (0, 255, 0), 1)
    cv2.putText(result_img, "T=Truck", (100, y_leg), font, 0.45, (0, 200, 255), 1)
    cv2.putText(result_img, "S=Semi", (200, y_leg), font, 0.45, (0, 0, 255), 1)

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

        annotated_img, total_spots, vehicle_counts, open_spots = (
            process_parking_image_civil(
                img_bgr, mask_gray, gsd_ft_px=gsd_ft_px, auto_gsd=auto_gsd
            )
        )

        os.makedirs(os.path.dirname(output_image_path) or ".", exist_ok=True)
        cv2.imwrite(output_image_path, annotated_img)

        return {
            "total_spots": total_spots,
            "output_image_path": output_image_path,
            "vehicles": vehicle_counts,
            "open_spots": open_spots,
        }
