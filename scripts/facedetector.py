import cv2
import json
import os

def detect_candidate_photo(image_path, board_id):
    """
    Detect candidate photo in marksheet image.
    
    Args:
        image_path (str): Path to JPG image
        board_id (int): 0=Uttarakhand, 1=CBSE, 2=ICSE
    
    Returns:
        dict: {"board": str, "photo_detected": int}
    """
    board_names = {0: "Uttarakhand", 1: "CBSE", 2: "ICSE"}
    board_name = board_names.get(board_id, "Unknown")
    
    
    # Check if image exists
    if not os.path.exists(image_path):
        print(f"Error: Image file '{image_path}' not found.")
        return {"board": board_name, "photo_detected": 0}
    
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not load image '{image_path}'.")
        return {"board": board_name, "photo_detected": 0}
    
    # Crop to top 30% where photos usually appear
    height = img.shape[0]
    img_cropped = img[:int(height * 0.3), :]
    
    # Convert to grayscale
    gray = cv2.cvtColor(img_cropped, cv2.COLOR_BGR2GRAY)
    
    # Use Haar cascade face detector (reliable and built-in)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    
    return {"board": board_name, "photo_detected": 1 if len(faces) > 0 else 0}

def main():
    """Interactive main function"""
    print("=== Marksheet Photo Detection System ===\n")
    
    # Get board selection
    print("Select Board:")
    print("0 → Uttarakhand Board")
    print("1 → CBSE Board")
    print("2 → ICSE Board")
    
    try:
        board_id = int(input("\nEnter board ID (0/1/2): "))
        if board_id not in [0, 1, 2]:
            print("Error: Invalid board ID. Please enter 0, 1, or 2.")
            return
    except ValueError:
        print("Error: Please enter a valid number.")
        return
    
    # Get image path
    image_path = input("Enter image path (e.g., datasetnew/10_1.jpg): ").strip()
    
    # Run detection
    print(f"\nProcessing image: {image_path}")
    print(f"Board: {['Uttarakhand', 'CBSE', 'ICSE'][board_id]}")
    print("-" * 40)
    
    result = detect_candidate_photo(image_path, board_id)
    
    # Display result
    print("\nResult:")
    print(json.dumps(result, indent=2))
    
    # Save result to file
    with open("detection_result.json", "w") as f:
        json.dump(result, f, indent=2)
    print("\nResult saved to: detection_result.json")

if __name__ == "__main__":
    main()