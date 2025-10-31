import time
import json
import os
from PIL import Image
from unstract.llmwhisperer import LLMWhispererClientV2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
api_key = os.getenv("UNSTRANCT_API_KEY")
if not api_key:
    print("Error: UNSTRANCT_API_KEY environment variable not found!")
    print("Please create a .env file with your API key:")
    print("UNSTRANCT_API_KEY=your_actual_api_key_here")
    exit(1)

# Initialize client
client = LLMWhispererClientV2(base_url="https://llmwhisperer-api.us-central.unstract.com/api/v2",
                              api_key=api_key)

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
        x1, y1 = int(coordinates["x1"]), int(coordinates["y1"])
        x2, y2 = int(coordinates["x2"]), int(coordinates["y2"])

        # Expand by margin_ratio on each side
        width = max(0, x2 - x1)
        height = max(0, y2 - y1)
        pad_x = int(round(width * margin_ratio))
        pad_y = int(round(height * margin_ratio))

        x1 -= pad_x
        y1 -= pad_y
        x2 += pad_x
        y2 += pad_y

        # Ensure coordinates are within image bounds
        x1 = max(0, min(x1, img.width))
        y1 = max(0, min(y1, img.height))
        x2 = max(0, min(x2, img.width))
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
    result = client.whisper(file_path=image_path)
    
    while True:
        status = client.whisper_status(whisper_hash=result['whisper_hash'])
        if status['status'] == 'processed':
            resultx = client.whisper_retrieve(whisper_hash=result['whisper_hash'])
            break
        time.sleep(5)
    
    extracted_text = resultx['extraction']['result_text']
    return extracted_text



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
    if marks_table:
        print(f"  Processing Marks Table (confidence: {marks_table['confidence']:.3f})")
        cropped_img = crop_table_from_image(image_path, marks_table["coordinates"], margin_ratio=0.10)
        temp_file = save_cropped_image(cropped_img, filename, "marks")
        
        try:
            marks_text = process_ocr(temp_file)
            marks_output_path = os.path.join(results_dir, f"{filename}_marks.txt")
            with open(marks_output_path, 'w', encoding='utf-8') as f:
                f.write(marks_text)
            print(f"  Saved marks table to: {marks_output_path}")
        except Exception as e:
            print(f"  Error processing marks table: {e}")
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file):
                os.remove(temp_file)
    
    # Process Information Table
    if info_table:
        print(f"  Processing Information Table (confidence: {info_table['confidence']:.3f})")
        cropped_img = crop_table_from_image(image_path, info_table["coordinates"], margin_ratio=0.10)
        temp_file = save_cropped_image(cropped_img, filename, "info")
        
        try:
            info_text = process_ocr(temp_file)
            info_output_path = os.path.join(results_dir, f"{filename}_info.txt")
            with open(info_output_path, 'w', encoding='utf-8') as f:
                f.write(info_text)
            print(f"  Saved info table to: {info_output_path}")
        except Exception as e:
            print(f"  Error processing info table: {e}")
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file):
                os.remove(temp_file)
    
    if not marks_table and not info_table:
        print(f"  No tables found in {filename}")

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