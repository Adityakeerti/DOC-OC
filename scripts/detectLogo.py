from pathlib import Path
import cv2
import numpy as np
from ultralytics import YOLO
import os

os.environ['YOLO_VERBOSE'] = 'False'


def ensure_portrait(image: np.ndarray) -> np.ndarray:
	if image is None or image.size == 0:
		return image
	height, width = image.shape[:2]
	if width > height:
		return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
	return image


def enhance_contrast(image: np.ndarray, clip_limit: float) -> np.ndarray:
	if image is None or image.size == 0:
		return image
	gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
	clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
	gray_eq = clahe.apply(gray)
	return cv2.cvtColor(gray_eq, cv2.COLOR_GRAY2BGR)


def detect_logo(image_path: str, model_path: str = "models\logo.pt") -> int:
	"""
	Detect logo in image and return class ID.
	
	Args:
		image_path: Path to input image
		model_path: Path to YOLO model weights
	
	Returns:
		0: Uttarakhand
		1: CBSE
		2: ICSE
		-1: No detection
	"""
	model = YOLO(model_path, verbose=False)
	img = cv2.imread(image_path)
	if img is None:
		return -1
	
	img = ensure_portrait(img)
	
	for clip_val in range(9, 14):
		processed = enhance_contrast(img, float(clip_val))
		results = model.predict(source=processed, verbose=False)
		
		if results and results[0].boxes is not None and len(results[0].boxes) > 0:
			conf = results[0].boxes.conf.cpu().numpy()
			cls = results[0].boxes.cls.cpu().numpy()
			
			valid_mask = conf >= 0.25
			if valid_mask.any():
				best_idx = int(np.argmax(conf[valid_mask]))
				return int(cls[valid_mask][best_idx])
	
	return -1


def detect_logo_with_boxes(image_path: str, model_path: str = "models\logo.pt") -> list:
	"""
	Detect logo in image and return bounding boxes.
	
	Args:
		image_path: Path to input image
		model_path: Path to YOLO model weights
	
	Returns:
		list: List of bounding boxes [(x1, y1, x2, y2), ...]
	"""
	print(f"Logo detection with boxes for: {image_path}")
	model = YOLO(model_path, verbose=False)
	img = cv2.imread(image_path)
	if img is None:
		print(f"Failed to load image: {image_path}")
		return []
	
	print(f"Image loaded, shape: {img.shape}")
	img = ensure_portrait(img)
	print(f"After portrait check, shape: {img.shape}")
	
	for clip_val in range(9, 14):
		processed = enhance_contrast(img, float(clip_val))
		results = model.predict(source=processed, verbose=False)
		
		if results and results[0].boxes is not None and len(results[0].boxes) > 0:
			conf = results[0].boxes.conf.cpu().numpy()
			cls = results[0].boxes.cls.cpu().numpy()
			boxes = results[0].boxes.xyxy.cpu().numpy()
			
			print(f"Found {len(conf)} detections with confidences: {conf}")
			valid_mask = conf >= 0.25
			if valid_mask.any():
				# Return the best detection (highest confidence) like the original function
				best_idx = int(np.argmax(conf[valid_mask]))
				best_box = boxes[valid_mask][best_idx]
				print(f"Best detection box: {best_box}")
				return [best_box.tolist()]
	
	print("No valid logo detections found")
	return []


if __name__ == "__main__":
	import sys
	if len(sys.argv) < 2:
		print("Usage: python detectLogo.py <image_path> [model_path]")
		sys.exit(1)
	
	image_path = sys.argv[1]
	model_path = sys.argv[2] if len(sys.argv) > 2 else "models\logo.pt"
	
	result = detect_logo(image_path, model_path)
	print(result)