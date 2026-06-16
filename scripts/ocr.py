import time
import json
import os
from PIL import Image
from dotenv import load_dotenv

# Lazy import — package may not be installed in all environments
try:
    from unstract.llmwhisperer import LLMWhispererClientV2
    _unstract_available = True
except ImportError:
    _unstract_available = False

# Load environment variables
load_dotenv()
api_key = os.getenv("UNSTRANCT_API_KEY")

# Initialize client only if package installed and API key is available
client = None
if _unstract_available and api_key and api_key != "your_api_key_here":
    try:
        client = LLMWhispererClientV2(base_url="https://llmwhisperer-api.us-central.unstract.com/api/v2",
                                      api_key=api_key)
    except Exception as e:
        print(f"Warning: Failed to initialize OCR client: {e}")
        client = None
else:
    if not _unstract_available:
        print("Warning: unstract-llmwhisperer not installed. OCR will be skipped.")
    else:
        print("Warning: No valid OCR API key found. OCR will be skipped.")

# Create OCR results directory if it doesn't exist
results_dir = "data/output/ocr_results"
if not os.path.exists(results_dir):
    os.makedirs(results_dir, exist_ok=True)
    print(f"Created results directory: {results_dir}")

def get_max_confidence_table(tables, table_type):
    """Get the table with maximum confidence for a given table type"""
    filtered_tables = [table for table in tables if table["table_type"] == table_type]
    if not filtered_tables:
        return None
    return max(filtered_tables, key=lambda x: x["confidence"])

def crop_table_from_image(image_path, coordinates, margin_ratio: float = 0.10):
    """Crop table region from image using coordinates with optional margin expansion."""
    with Image.open(image_path) as img:
        # Use full width of image to prevent horizontal clipping of columns
        x1 = 0
        x2 = img.width

        y1 = int(coordinates["y1"])
        y2 = int(coordinates["y2"])

        # Expand vertically by margin_ratio
        height = max(0, y2 - y1)
        pad_y = int(round(height * margin_ratio))

        y1 -= pad_y
        y2 += pad_y

        # Ensure coordinates are within image bounds
        y1 = max(0, min(y1, img.height))
        y2 = max(0, min(y2, img.height))

        cropped_img = img.crop((x1, y1, x2, y2))
        return cropped_img

def save_cropped_image(cropped_img, filename, table_type):
    """Save cropped image temporarily for OCR processing"""
    temp_filename = f"temp_{filename}_{table_type.replace(' ', '_').lower()}.jpg"
    # Ensure image is in RGB mode for JPEG compatibility
    if cropped_img.mode != 'RGB':
        try:
            cropped_img = cropped_img.convert('RGB')
        except Exception:
            # Fallback: create a new RGB image and paste
            from PIL import Image
            rgb_bg = Image.new('RGB', cropped_img.size, (255, 255, 255))
            rgb_bg.paste(cropped_img, mask=cropped_img.split()[-1] if cropped_img.mode in ('RGBA', 'LA') else None)
            cropped_img = rgb_bg
    cropped_img.save(temp_filename, format='JPEG')
    return temp_filename

def process_ocr(image_path):
    """Process OCR on an image and return extracted text"""
    if not client:
        return "OCR not available - no valid API key"
    
    try:
        result = client.whisper(file_path=image_path)
        
        while True:
            status = client.whisper_status(whisper_hash=result['whisper_hash'])
            if status['status'] == 'processed':
                resultx = client.whisper_retrieve(whisper_hash=result['whisper_hash'])
                break
            time.sleep(5)
        
        extracted_text = resultx['extraction']['result_text']
        return extracted_text
    except Exception as e:
        return f"OCR failed: {str(e)}"



def process_image_with_tables(image_path, json_path):
    """Process a single image with its corresponding JSON file"""
    print(f"Processing: {os.path.basename(image_path)}")
    
    # Load JSON data
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    # Get filename without extension
    filename = os.path.splitext(os.path.basename(image_path))[0]
    
    # Extract table coordinates
    tables = data["table_detection"]["table_coordinates"]
    
    # Get tables with maximum confidence for each type
    marks_table = get_max_confidence_table(tables, "Marks Table")
    info_table = get_max_confidence_table(tables, "Information Table")
    
    # Process Marks Table
    print(f"  Processing Marks Table...")
    cropped_img_marks = None
    if marks_table:
        print(f"    Marks Table detected (confidence: {marks_table['confidence']:.3f})")
        cropped_img_marks = crop_table_from_image(image_path, marks_table["coordinates"], margin_ratio=0.10)
    else:
        print(f"    Marks Table NOT detected. Falling back to cropping bottom 65% of the image...")
        try:
            with Image.open(image_path) as img:
                width, height = img.size
                cropped_img_marks = img.crop((0, int(height * 0.35), width, height))
        except Exception as e:
            print(f"    Failed to crop bottom 65% of image: {e}")
            cropped_img_marks = None

    if cropped_img_marks:
        temp_file = save_cropped_image(cropped_img_marks, filename, "marks")
        try:
            marks_text = process_ocr(temp_file)
            marks_output_path = os.path.join(results_dir, f"{filename}_marks.txt")
            with open(marks_output_path, 'w', encoding='utf-8') as f:
                f.write(marks_text)
            if "OCR not available" in marks_text or "OCR failed" in marks_text:
                print(f"    Warning: {marks_text}")
            else:
                print(f"    Saved marks table to: {marks_output_path}")
        except Exception as e:
            print(f"    Error processing marks table: {e}")
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file):
                os.remove(temp_file)
    else:
        print(f"    Skipping marks table processing as no image was available")
    
    # Process Information Table
    print(f"  Processing Information Table...")
    cropped_img_info = None
    if info_table:
        print(f"    Information Table detected (confidence: {info_table['confidence']:.3f})")
        cropped_img_info = crop_table_from_image(image_path, info_table["coordinates"], margin_ratio=0.15)
    else:
        print(f"    Information Table NOT detected. Falling back to cropping top 40% of the image...")
        try:
            with Image.open(image_path) as img:
                width, height = img.size
                cropped_img_info = img.crop((0, 0, width, int(height * 0.40)))
        except Exception as e:
            print(f"    Failed to crop top 40% of image: {e}")
            cropped_img_info = None

    if cropped_img_info:
        temp_file = save_cropped_image(cropped_img_info, filename, "info")
        try:
            info_text = process_ocr(temp_file)
            info_output_path = os.path.join(results_dir, f"{filename}_info.txt")
            with open(info_output_path, 'w', encoding='utf-8') as f:
                f.write(info_text)
            if "OCR not available" in info_text or "OCR failed" in info_text:
                print(f"    Warning: {info_text}")
            else:
                print(f"    Saved info table to: {info_output_path}")
        except Exception as e:
            print(f"    Error processing info table: {e}")
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file):
                os.remove(temp_file)
    else:
        print(f"    Skipping info table processing as no image was available")
    
    if not marks_table and not info_table:
        print(f"  No tables detected at all by the model.")

def list_available_images():
    """List all available images in the inputs folder"""
    inputs_dir = "data/input"
    
    if not os.path.exists(inputs_dir):
        print(f"Error: {inputs_dir} directory not found!")
        return []
    
    # Get all image files and their corresponding JSON files
    image_files = []
    for file in os.listdir(inputs_dir):
        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
            # Extract base name (remove _preprocessed and extension)
            base_name = file.replace('_preprocessed', '').replace('.jpg', '').replace('.jpeg', '').replace('.png', '')
            json_file = f"{base_name}_result.json"
            json_path = os.path.join(inputs_dir, json_file)
            
            if os.path.exists(json_path):
                image_files.append((os.path.join(inputs_dir, file), json_path))
            else:
                print(f"Warning: No JSON file found for {file} (looking for {json_file})")
    
    return image_files

def process_single_image(image_path, json_path):
    """Process a single image"""
    print(f"Processing: {os.path.basename(image_path)}")
    try:
        process_image_with_tables(image_path, json_path)
        print("Processing completed successfully!")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

def main():
    """Main function with interactive image selection"""
    print("OCR Table Processing Tool")
    print("=" * 40)
    
    # Get available images
    image_files = list_available_images()
    
    if not image_files:
        print("No image files with corresponding JSON files found!")
        return
    
    while True:
        print(f"\nAvailable images ({len(image_files)} found):")
        print("-" * 30)
        
        for i, (image_path, json_path) in enumerate(image_files, 1):
            filename = os.path.basename(image_path)
            print(f"{i}. {filename}")
        
        print("\nCommands:")
        print("  <number>  - Process specific image (1-{})".format(len(image_files)))
        print("  all       - Process all images")
        print("  list      - Show this list again")
        print("  quit/exit - Exit the program")
        
        choice = input("\nEnter your choice: ").strip().lower()
        
        if choice in ['quit', 'exit', 'q']:
            print("Goodbye!")
            break
        elif choice == 'all':
            print(f"\nProcessing all {len(image_files)} images...")
            print("=" * 50)
            for i, (image_path, json_path) in enumerate(image_files, 1):
                print(f"[{i}/{len(image_files)}] Processing: {os.path.basename(image_path)}")
                try:
                    process_image_with_tables(image_path, json_path)
                except Exception as e:
                    print(f"Error processing {image_path}: {e}")
                print("-" * 30)
            print("All images processed!")
        elif choice == 'list':
            continue
        elif choice.isdigit():
            image_index = int(choice) - 1
            if 0 <= image_index < len(image_files):
                image_path, json_path = image_files[image_index]
                print(f"\nSelected: {os.path.basename(image_path)}")
                process_single_image(image_path, json_path)
            else:
                print(f"Invalid choice! Please enter a number between 1 and {len(image_files)}")
        else:
            print("Invalid choice! Please enter a number, 'all', 'list', or 'quit'")

if __name__ == "__main__":
    main()