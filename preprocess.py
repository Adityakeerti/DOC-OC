"""
Preprocessing utilities for marksheet images.

Provides a simple pipeline:
- Load image
- Detect the largest page-like contour and crop so only the marksheet is visible
- Boost contrast using CLAHE on the L (or V) channel
- Reduce saturation slightly to stabilize OCR

Returns (processed_image, original_image, crop_coords)
where crop_coords = (x1, y1, x2, y2) in original image coordinates.
"""

from typing import Tuple, Optional
import cv2
import numpy as np


def _find_largest_contour_cropping_box(image_gray: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    """
    Find a tight bounding box around the largest high-contrast region (the marksheet page).
    This uses Canny + contour detection and returns a bounding rectangle.
    """
    # Edges
    blurred = cv2.GaussianBlur(image_gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    # Dilate to connect edges
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    # Choose the largest contour by area
    largest_cnt = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest_cnt)

    # Expand slightly to avoid tight cuts
    pad_x = int(0.01 * image_gray.shape[1])
    pad_y = int(0.01 * image_gray.shape[0])
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(image_gray.shape[1], x + w + pad_x)
    y2 = min(image_gray.shape[0], y + h + pad_y)
    return (x1, y1, x2, y2)


def _apply_contrast_and_saturation(img_bgr: np.ndarray) -> np.ndarray:
    """
    Boost contrast with CLAHE on the L channel (via LAB) and reduce saturation ~15% via HSV.
    """
    # Contrast (CLAHE on LAB L channel)
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_eq = clahe.apply(l)
    lab_eq = cv2.merge((l_eq, a, b))
    bgr_eq = cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)

    # Reduce saturation in HSV
    hsv = cv2.cvtColor(bgr_eq, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    s = (s.astype(np.float32) * 0.85).clip(0, 255).astype(np.uint8)
    hsv_mod = cv2.merge((h, s, v))
    bgr_out = cv2.cvtColor(hsv_mod, cv2.COLOR_HSV2BGR)
    return bgr_out


def preprocess_marksheet(image_path: str,
                         output_path: Optional[str] = None,
                         save_intermediate: bool = False):
    """
    Load an image, crop to the marksheet region, enhance contrast and reduce saturation.

    Args:
        image_path: Path to the input image
        output_path: Optional path to save the processed image (unused when None)
        save_intermediate: Whether to save intermediate images (not used; kept for compatibility)

    Returns:
        processed_image (np.ndarray), original_image (np.ndarray), crop_coords (x1,y1,x2,y2)
    """
    original = cv2.imread(image_path)
    if original is None:
        raise FileNotFoundError(f"Failed to read image: {image_path}")

    # Ensure portrait orientation similar to downstream expectations
    h, w = original.shape[:2]
    img = original.copy()
    if w > h:
        img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Find crop box
    crop_box = _find_largest_contour_cropping_box(gray)
    if crop_box is None:
        # Fall back to the whole image
        x1, y1, x2, y2 = 0, 0, img.shape[1], img.shape[0]
    else:
        x1, y1, x2, y2 = crop_box

    cropped = img[y1:y2, x1:x2]
    if cropped.size == 0:
        cropped = img
        x1, y1, x2, y2 = 0, 0, img.shape[1], img.shape[0]

    # Enhance
    enhanced = _apply_contrast_and_saturation(cropped)

    # Save if path provided
    if output_path:
        try:
            cv2.imwrite(output_path, enhanced)
        except Exception:
            pass

    crop_coords = (int(x1), int(y1), int(x2), int(y2))
    return enhanced, original, crop_coords


