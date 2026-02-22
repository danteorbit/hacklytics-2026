"""
SnapPark Backend API
Flask server that exposes the parking lot analysis pipeline to the frontend.
"""

import os
import uuid
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from snappark import ParkingPredictor
from parking_processor import process_parking_image_civil

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
RESULTS_FOLDER = os.path.join(BASE_DIR, "results")
MODEL_PATH = os.path.join(BASE_DIR, "models", "segformer-epoch=11-val_loss=0.17.ckpt")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# ── Flask App ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)  # Allow the frontend (on a different port) to call the API

# ── Load Model Once ───────────────────────────────────────────────────────────
print("Initializing SnapPark model...")
predictor = ParkingPredictor(MODEL_PATH)
print("Model ready.")


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ── Routes ────────────────────────────────────────────────────────────────────


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "model_loaded": True})


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Accepts an image upload, runs the parking lot analysis pipeline,
    and returns the annotated image + spot count.

    Request: multipart/form-data with field 'image'
    Response: JSON with total_spots, result_image URL
    """
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use jpg, jpeg, or png."}), 400

    # Save uploaded file
    job_id = str(uuid.uuid4())[:8]
    ext = secure_filename(file.filename).rsplit(".", 1)[1].lower()
    input_filename = f"{job_id}_input.{ext}"
    input_path = os.path.join(UPLOAD_FOLDER, input_filename)
    file.save(input_path)

    try:
        # 1. Load the image
        img_bgr = cv2.imread(input_path)
        if img_bgr is None:
            return jsonify({"error": "Could not read the uploaded image"}), 400

        h_img, w_img = img_bgr.shape[:2]

        # 2. Predict mask using the SegFormer model
        pil_mask = predictor.predict(input_path)
        mask_arr = np.array(pil_mask)
        print(
            f"[DEBUG] mask_arr shape={mask_arr.shape}, dtype={mask_arr.dtype}, "
            f"min={mask_arr.min()}, max={mask_arr.max()}, "
            f"nonzero={np.count_nonzero(mask_arr)}"
        )

        # 3. Convert mask to grayscale
        if mask_arr.ndim == 3:
            if mask_arr.shape[2] == 4:
                mask_gray = cv2.cvtColor(mask_arr, cv2.COLOR_RGBA2GRAY)
            else:
                mask_gray = cv2.cvtColor(mask_arr, cv2.COLOR_RGB2GRAY)
        else:
            mask_gray = mask_arr

        mask_gray = mask_gray.astype(np.uint8)

        # 4. Resize mask to match image if needed
        h_mask, w_mask = mask_gray.shape[:2]
        if (h_img, w_img) != (h_mask, w_mask):
            print(
                f"[DEBUG] Resizing mask from ({h_mask},{w_mask}) to ({h_img},{w_img})"
            )
            mask_gray = cv2.resize(
                mask_gray, (w_img, h_img), interpolation=cv2.INTER_NEAREST
            )

        print(
            f"[DEBUG] mask_gray: shape={mask_gray.shape}, nonzero={np.count_nonzero(mask_gray)}, "
            f"unique_values={np.unique(mask_gray)}"
        )

        # 5. Run the civil engineering grid analysis
        annotated_img, total_spots = process_parking_image_civil(
            img_bgr, mask_gray, gsd_ft_px=0.5, auto_gsd=True
        )
        print(f"[DEBUG] total_spots={total_spots}")

        # 6. Save the annotated result
        result_filename = f"{job_id}_result.jpg"
        result_path = os.path.join(RESULTS_FOLDER, result_filename)
        cv2.imwrite(result_path, annotated_img)

        # 7. Save the mask for reference
        mask_filename = f"{job_id}_mask.jpg"
        mask_path = os.path.join(RESULTS_FOLDER, mask_filename)
        cv2.imwrite(mask_path, mask_gray)

        return jsonify(
            {
                "job_id": job_id,
                "total_spots": total_spots,
                "result_image": f"/api/results/{result_filename}",
                "mask_image": f"/api/results/{mask_filename}",
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/results/<filename>", methods=["GET"])
def get_result(filename):
    """Serve a result image by filename."""
    filepath = os.path.join(RESULTS_FOLDER, secure_filename(filename))
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404
    return send_file(filepath, mimetype="image/jpeg")


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
