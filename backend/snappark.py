import torch
import torch.nn as nn
import pytorch_lightning as pl
from transformers import SegformerForSemanticSegmentation, SegformerImageProcessor
from torchmetrics.classification import BinaryJaccardIndex
import numpy as np
import cv2
from PIL import Image


# --- 1. Model Definition ---
# This must match the class structure used during training
class SegFormerLightning(pl.LightningModule):
    def __init__(self, model_name="nvidia/mit-b0", learning_rate=1e-4, dropout=0.1):
        super().__init__()
        self.save_hyperparameters()
        self.learning_rate = learning_rate

        self.model = SegformerForSemanticSegmentation.from_pretrained(
            model_name,
            num_labels=1,
            ignore_mismatched_sizes=True,
            hidden_dropout_prob=dropout,
            attention_probs_dropout_prob=dropout,
            classifier_dropout_prob=dropout,
        )

        self.criterion = nn.BCEWithLogitsLoss()
        self.iou_metric = BinaryJaccardIndex()

    def forward(self, pixel_values):
        return self.model(pixel_values=pixel_values).logits

    def configure_optimizers(self):
        return torch.optim.AdamW(self.parameters(), lr=self.learning_rate)


# --- 2. Post-Processing Helper ---
def refine_mask(pred_mask_np):
    """
    Refines a binary mask by smoothing edges and approximating polygons.
    """
    mask_uint8 = (pred_mask_np * 255).astype(np.uint8)

    # Morphological Operations
    kernel = np.ones((5, 5), np.uint8)
    mask_closed = cv2.morphologyEx(mask_uint8, cv2.MORPH_CLOSE, kernel)
    mask_cleaned = cv2.morphologyEx(mask_closed, cv2.MORPH_OPEN, kernel)

    # Contour Approximation
    contours, _ = cv2.findContours(
        mask_cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    refined_mask = np.zeros_like(mask_cleaned)

    for cnt in contours:
        epsilon = 0.03 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        cv2.drawContours(refined_mask, [approx], -1, 255, -1)

    return refined_mask


# --- 3. Inference Wrapper Class ---
class ParkingPredictor:
    def __init__(self, checkpoint_path, device=None):
        """
        Initializes the predictor by loading the model weights and processor.
        """
        self.device = (
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        print(f"Loading model from {checkpoint_path} to {self.device}...")

        # Load Model from Checkpoint
        # strict=False allows flexibility if minor attributes (like optimizers) differ
        self.model = SegFormerLightning.load_from_checkpoint(
            checkpoint_path, map_location=self.device
        )
        self.model.to(self.device)
        self.model.eval()

        # Initialize Processor
        self.processor = SegformerImageProcessor(do_resize=False, do_normalize=True)
        print("Model loaded successfully.")

    def predict(self, image_input):
        """
        Runs inference on a single image and returns the refined PIL mask.
        """
        # Load Image
        if isinstance(image_input, str):
            image = Image.open(image_input).convert("RGB")
        else:
            image = image_input.convert("RGB")

        # Preprocess
        encoded_inputs = self.processor(images=image, return_tensors="pt")
        pixel_values = encoded_inputs.pixel_values.to(self.device)

        # Inference
        with torch.no_grad():
            logits = self.model(pixel_values)

        # Resize
        original_size = image.size[::-1]  # (H, W)
        upsampled_logits = nn.functional.interpolate(
            logits, size=original_size, mode="bilinear", align_corners=False
        )

        # Binarize
        preds = (torch.sigmoid(upsampled_logits) > 0.5).float()
        pred_mask_np = preds.squeeze().cpu().numpy()

        # Post-Process
        refined_mask = refine_mask(pred_mask_np)

        return Image.fromarray(refined_mask)
