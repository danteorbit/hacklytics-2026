import os
import cv2
import numpy as np
from scipy.stats import mode
from snappark import ParkingPredictor

# ==========================================
# 1. HELPER FUNCTIONS & GSD
# ==========================================

def estimate_gsd_from_lines(img_bgr, mask_gray):
    roi = cv2.bitwise_and(img_bgr, img_bgr, mask=mask_gray)
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    edges = cv2.Canny(clahe.apply(gray), 50, 150)

    lines = cv2.HoughLinesP(
        edges, rho=1, theta=np.pi / 180, threshold=50, minLineLength=20, maxLineGap=10
    )
    if lines is None:
        return None

    angles = [
        np.degrees(np.arctan2(l[0][3] - l[0][1], l[0][2] - l[0][0])) % 180
        for l in lines
    ]
    if not angles:
        return None
    dominant_angle = mode(np.round(angles), keepdims=True).mode[0]

    rhos = []
    theta_rad = np.radians(dominant_angle)
    for l in lines:
        x1, y1, x2, y2 = l[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1)) % 180
        if abs(angle - dominant_angle) < 5 or abs(angle - dominant_angle) > 175:
            rhos.append(abs(x1 * np.cos(theta_rad) + y1 * np.sin(theta_rad)))

    if len(rhos) < 2:
        return None
    differences = np.diff(np.sort(rhos))
    valid_diffs = differences[(differences > 8) & (differences < 300)]

    if len(valid_diffs) == 0:
        return None
    return 8.7 / np.median(valid_diffs)


def get_longest_edge_angle(contour):
    """Finds the longest straight edge of a contour to act as the baseline."""
    approx = cv2.approxPolyDP(contour, 0.01 * cv2.arcLength(contour, True), True)
    max_dist = 0
    best_angle = 0
    pts = approx.reshape(-1, 2)
    n = len(pts)

    if n < 2:
        return 0.0

    for i in range(n):
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        dist = np.linalg.norm(p2 - p1)
        if dist > max_dist:
            max_dist = dist
            best_angle = np.arctan2(p2[1] - p1[1], p2[0] - p1[0])

    return best_angle


# ==========================================
# 2. CIVIL ENGINEERING PARKING BLOB
# ==========================================

class ParkingSpot:
    def __init__(self, cx, cy, spot_poly, car_poly):
        self.cx = cx
        self.cy = cy
        self.spot_poly = spot_poly
        self.car_poly = car_poly


class CivilParkingBlob:
    def __init__(self, blob_id, mask_gray, blob_mask, contour, params):
        self.blob_id = blob_id
        self.mask = mask_gray
        self.blob_mask = blob_mask
        self.contour = contour
        self.h, self.w = self.mask.shape

        self.spot_w = params["spot_w"]
        self.spot_l = params["spot_l"]
        self.car_w = params["car_w"]
        self.car_l = params["car_l"]
        self.aisle_len = params["aisle_len"]
        self.gsd = params["gsd"]

        self.area_px = cv2.contourArea(self.contour)
        self.area_sqft = int(self.area_px * (self.gsd**2))

        self.confirmed_spots = []
        self._calculate_cad_baseline()

    def _calculate_cad_baseline(self):
        M = cv2.moments(self.contour)
        if M["m00"] != 0:
            self.origin = np.array([int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"])])
        else:
            self.origin = np.array([self.w // 2, self.h // 2])

        angle_rad = get_longest_edge_angle(self.contour)
        self.v_w = np.array([np.cos(angle_rad), np.sin(angle_rad)])
        self.v_l = np.array([-np.sin(angle_rad), np.cos(angle_rad)])

        x, y, w, h = cv2.boundingRect(self.contour)
        max_dim = max(w, h)
        self.diag_w = int((max_dim) / self.spot_w) + 2
        self.diag_l = int((max_dim) / self.spot_l) + 2

    def process_layout(self):
        best_spots = []
        shifts_w = np.linspace(0, self.spot_w, 3, endpoint=False)
        shifts_l = np.linspace(0, (2 * self.spot_l) + self.aisle_len, 3, endpoint=False)

        for sw in shifts_w:
            for sl in shifts_l:
                test_origin = self.origin + (sw * self.v_w) + (sl * self.v_l)
                current_spots = self._test_grid(test_origin)
                if len(current_spots) > len(best_spots):
                    best_spots = current_spots

        self.confirmed_spots = best_spots

    def _test_grid(self, origin):
        valid_spots = []
        access_dist = (0.5 * self.spot_l) + (10.0 / self.gsd)

        for i in range(-self.diag_w, self.diag_w):
            for j in range(-self.diag_l, self.diag_l):
                offset_w = i * self.spot_w
                cycle_idx = j // 2
                spot_in_cycle = j % 2
                offset_l = (cycle_idx * ((2 * self.spot_l) + self.aisle_len)) + (
                    spot_in_cycle * self.spot_l
                )

                center = origin + (offset_w * self.v_w) + (offset_l * self.v_l)
                cx, cy = int(center[0]), int(center[1])

                if 0 <= cx < self.w and 0 <= cy < self.h:
                    sp1 = (
                        center
                        - (0.5 * self.spot_w * self.v_w)
                        - (0.5 * self.spot_l * self.v_l)
                    )
                    sp2 = (
                        center
                        + (0.5 * self.spot_w * self.v_w)
                        - (0.5 * self.spot_l * self.v_l)
                    )
                    sp3 = (
                        center
                        + (0.5 * self.spot_w * self.v_w)
                        + (0.5 * self.spot_l * self.v_l)
                    )
                    sp4 = (
                        center
                        - (0.5 * self.spot_w * self.v_w)
                        + (0.5 * self.spot_l * self.v_l)
                    )
                    spot_poly = np.array([sp1, sp2, sp3, sp4], dtype=np.int32)

                    is_valid = True
                    for pt in [center, sp1, sp2, sp3, sp4]:
                        px, py = int(pt[0]), int(pt[1])
                        if 0 <= px < self.w and 0 <= py < self.h:
                            if self.blob_mask[py, px] == 0:
                                is_valid = False
                                break
                        else:
                            is_valid = False
                            break

                    if is_valid:
                        access_pt = (
                            center - access_dist * self.v_l
                            if spot_in_cycle == 0
                            else center + access_dist * self.v_l
                        )
                        ax, ay = int(access_pt[0]), int(access_pt[1])

                        if 0 <= ax < self.w and 0 <= ay < self.h:
                            if self.mask[ay, ax] == 0:
                                is_valid = False
                        else:
                            is_valid = False

                    if is_valid:
                        cp1 = (
                            center
                            - (0.5 * self.car_w * self.v_w)
                            - (0.5 * self.car_l * self.v_l)
                        )
                        cp2 = (
                            center
                            + (0.5 * self.car_w * self.v_w)
                            - (0.5 * self.car_l * self.v_l)
                        )
                        cp3 = (
                            center
                            + (0.5 * self.car_w * self.v_w)
                            + (0.5 * self.car_l * self.v_l)
                        )
                        cp4 = (
                            center
                            - (0.5 * self.car_w * self.v_w)
                            + (0.5 * self.car_l * self.v_l)
                        )
                        car_poly = np.array([cp1, cp2, cp3, cp4], dtype=np.int32)
                        valid_spots.append(ParkingSpot(cx, cy, spot_poly, car_poly))

        return valid_spots

    def draw(self, canvas):
        cv2.drawContours(canvas, [self.contour], -1, (0, 255, 255), 2)

        for spot in self.confirmed_spots:
            cv2.polylines(canvas, [spot.spot_poly], True, (0, 255, 0), 1)
            cv2.polylines(canvas, [spot.car_poly], True, (255, 0, 0), 2)

        font = cv2.FONT_HERSHEY_SIMPLEX
        bcx, bcy = int(self.origin[0]), int(self.origin[1])

        label = f"Lot {self.blob_id}: {len(self.confirmed_spots)} Cars | {self.area_sqft:,} sqft"
        cv2.putText(canvas, label, (bcx - 80, bcy), font, 0.6, (0, 0, 0), 3)
        cv2.putText(canvas, label, (bcx - 80, bcy), font, 0.6, (0, 255, 0), 2)


# ==========================================
# 3. BATCH PROCESSOR
# ==========================================

def process_parking_image_civil(img_bgr, mask_gray, gsd_ft_px=0.5, auto_gsd=True):
    _, binary_mask = cv2.threshold(mask_gray, 127, 255, cv2.THRESH_BINARY)

    active_gsd = gsd_ft_px
    if auto_gsd:
        detected_gsd = estimate_gsd_from_lines(img_bgr, binary_mask)
        if detected_gsd is not None:
            active_gsd = detected_gsd

    px_per_ft = 1.0 / active_gsd
    params = {
        "spot_w": 8.7 * px_per_ft,
        "spot_l": 19.0 * px_per_ft,
        "car_w": 6.0 * px_per_ft,
        "car_l": 15.5 * px_per_ft,
        "aisle_len": 24.0 * px_per_ft,
        "gsd": active_gsd,
    }

    contours, _ = cv2.findContours(
        binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    result_img = img_bgr.copy()
    total_spots = 0
    blob_id = 1

    for contour in contours:
        area_px = cv2.contourArea(contour)
        if area_px < (params["car_w"] * params["car_l"] * 2):
            continue

        blob_mask = np.zeros_like(binary_mask)
        cv2.drawContours(blob_mask, [contour], -1, 255, -1)

        blob_obj = CivilParkingBlob(blob_id, binary_mask, blob_mask, contour, params)
        blob_obj.process_layout()
        blob_obj.draw(result_img)

        total_spots += len(blob_obj.confirmed_spots)
        blob_id += 1

    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(
        result_img,
        f"TOTAL CARS IN IMAGE: {total_spots}",
        (20, 40),
        font,
        1.0,
        (0, 0, 0),
        5,
    )
    cv2.putText(
        result_img,
        f"TOTAL CARS IN IMAGE: {total_spots}",
        (20, 40),
        font,
        1.0,
        (0, 255, 255),
        2,
    )

    return result_img, total_spots


def batch_process_parking_grids(
    input_dir, output_dir, predictor, gsd_ft_px=0.5, auto_gsd=True, verbose=False
):
    os.makedirs(output_dir, exist_ok=True)

    valid_extensions = (".jpg", ".jpeg", ".png")
    images = [
        os.path.join(root, f)
        for root, _, files in os.walk(input_dir)
        for f in files
        if f.lower().endswith(valid_extensions)
    ]

    if verbose:
        print(
            f"Starting batch process on {len(images)} images (Contour Baseline Mode)..."
        )

    for i, path in enumerate(images):
        try:
            img_bgr = cv2.imread(path)
            if img_bgr is None:
                if verbose:
                    print(f"Failed to load image: {path}")
                continue

            h_img, w_img = img_bgr.shape[:2]

            pil_mask = predictor.predict(path)
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
                if verbose:
                    print(
                        f"   -> Resizing mask from {w_mask}x{h_mask} to match image {w_img}x{h_img}"
                    )
                mask_gray = cv2.resize(
                    mask_gray, (w_img, h_img), interpolation=cv2.INTER_NEAREST
                )

            annotated_img, count = process_parking_image_civil(
                img_bgr, mask_gray, gsd_ft_px=gsd_ft_px, auto_gsd=auto_gsd
            )

            out_name = f"{os.path.splitext(os.path.basename(path))[0]}_civil_grid.jpg"
            cv2.imwrite(os.path.join(output_dir, out_name), annotated_img)

            if verbose:
                print(f"[{i+1}/{len(images)}] Saved: {out_name} | Cars: {count}")

        except Exception as e:
            if verbose:
                print(f"Error on {path}: {e}")


def batch_predict(
    input_image_locations, output_image_locations, predictor, show_images=False
):
    """
    Recursively searches for images, runs predictions, and saves the output masks.
    """
    os.makedirs(output_image_locations, exist_ok=True)

    list_of_input_images = []

    for root, dirs, files in os.walk(input_image_locations):
        for file in files:
            if file.lower().endswith((".jpg", ".jpeg")):
                list_of_input_images.append(os.path.join(root, file))

    if not list_of_input_images:
        print(f"No JPG images found in '{input_image_locations}'.")
        return

    print(f"Found {len(list_of_input_images)} images. Starting processing...")

    for i, image_path in enumerate(list_of_input_images):
        try:
            mask = predictor.predict(image_path)
            filename = os.path.basename(image_path)
            filename_without_ext = os.path.splitext(filename)[0]

            output_filename = f"{filename_without_ext}_mask_{i}.jpg"
            output_path = os.path.join(output_image_locations, output_filename)

            mask.save(output_path)

            if show_images:
                mask.show()

        except Exception as e:
            print(f"Error processing {image_path}: {e}")


# ==========================================
# 4. EXECUTION
# ==========================================

if __name__ == "__main__":
    # 1. Load the model
    predictor = ParkingPredictor("segformer-epoch=11-val_loss=0.17.ckpt")

    # 2. Setup directories
    input_dir = "batch_images_input"
    output_dir = "batch_images_output"

    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    # 3. Run batch processing
    batch_process_parking_grids(
        input_dir,
        output_dir,
        predictor=predictor,
        gsd_ft_px=0.5,
        auto_gsd=True,
        verbose=True,
    )