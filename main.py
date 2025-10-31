"""
Complete Marksheet Processing Pipeline
Integrates preprocessing, logo detection, face detection, and table verification
"""

import os
import sys
import json
import argparse
from pathlib import Path
import cv2
import numpy as np

# Add module path to sys.path for the consolidated scripts directory
sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))

# Import core modules
from preprocess import preprocess_marksheet
from scripts.detectLogo import detect_logo
from scripts.facedetector import detect_candidate_photo
from scripts.predict_table import process_single_image as detect_tables
# Defer OCR/extractor imports to runtime to avoid import-time failures when env/config missing
# from scripts.ocr import process_image_with_tables as ocr_process_image_with_tables
# from scripts.extractor import create_final_results_dir as extractor_create_results_dir, process_file as extractor_process_file


def create_annotated_image(image_path, logo_result, face_result, table_result, output_path, logo_model_path, table_model_path, board_name=None):
    """
    Create a single annotated image with all detections marked with bounding boxes
    
    Args:
        image_path: Path to original image
        logo_result: Logo detection result
        face_result: Face detection result  
        table_result: Table detection result
        output_path: Path to save annotated image
        logo_model_path: Path to logo detection model
        table_model_path: Path to table detection model
        board_name: Detected board name (e.g., "ICSE", "CBSE", "Uttarakhand")
    """
    # Load the original image
    print(f"Loading image for annotation: {image_path}")
    image = cv2.imread(image_path)
    if image is None:
        print(f"Failed to load image: {image_path}")
        return False
    
    print(f"Image loaded successfully, shape: {image.shape}")
    
    # Ensure portrait orientation
    height, width = image.shape[:2]
    if width > height:
        image = cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    
    # Define colors for different annotations
    colors = {
        'logo': (0, 255, 0),      # Green
        'face': (255, 0, 0),      # Blue  
        'table': (0, 0, 255),     # Red
        'text': (255, 255, 255)   # White
    }
    
    # Draw logo detection boxes
    if logo_result != -1:
        try:
            from detectLogo import detect_logo_with_boxes
            print(f"Detecting logo boxes for result: {logo_result}")
            logo_boxes = detect_logo_with_boxes(image_path, logo_model_path)
            print(f"Found {len(logo_boxes)} logo boxes")
            for box in logo_boxes:
                x1, y1, x2, y2 = box
                cv2.rectangle(image, (int(x1), int(y1)), (int(x2), int(y2)), colors['logo'], 4)
                cv2.putText(image, "LOGO", (int(x1), int(y1)-15), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, colors['logo'], 3)
        except Exception as e:
            print(f"Logo detection failed: {e}")
            pass  # If logo detection fails, continue without boxes
    
    # Draw face detection boxes
    if face_result["photo_detected"] == 1:
        try:
            # Crop to top 30% where photos usually appear
            height = image.shape[0]
            img_cropped = image[:int(height * 0.3), :]
            gray = cv2.cvtColor(img_cropped, cv2.COLOR_BGR2GRAY)
            
            # Use Haar cascade face detector
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            
            print(f"Found {len(faces)} faces")
            for (x, y, w, h) in faces:
                cv2.rectangle(image, (x, y), (x+w, y+h), colors['face'], 4)
                cv2.putText(image, "FACE", (x, y-15), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, colors['face'], 3)
        except Exception as e:
            print(f"Face detection failed: {e}")
            pass  # If face detection fails, continue without boxes
    
    # Draw table detection boxes
    if table_result == 1:
        try:
            from predict_table import detect_tables_with_boxes_and_scores
            print(f"Detecting table boxes for result: {table_result}")
            table_data = detect_tables_with_boxes_and_scores(image_path, table_model_path)
            print(f"Found {len(table_data)} table boxes")
            for i, (box, label, confidence) in enumerate(table_data):
                x1, y1, x2, y2 = box
                table_type = "INFO_TABLE" if label == 0 else "MARKS_TABLE"
                # Draw thicker rectangle for better visibility
                cv2.rectangle(image, (int(x1), int(y1)), (int(x2), int(y2)), colors['table'], 4)
                # Draw label with confidence score
                label_text = f"{table_type} ({confidence:.2f})"
                cv2.putText(image, label_text, (int(x1), int(y1)-15), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, colors['table'], 3)
        except Exception as e:
            print(f"Table detection failed: {e}")
            pass  # If table detection fails, continue without boxes
    
    # Add overall status text (ICSE may not contain a photo on some marksheets)
    is_icse = (str(board_name).upper() == "ICSE") if board_name else False
    is_valid = (logo_result != -1 and table_result == 1 and (face_result["photo_detected"] == 1 or is_icse))
    overall_status = "VALID MARKSHEET" if is_valid else "INVALID MARKSHEET"
    status_color = (0, 255, 0) if overall_status == "VALID MARKSHEET" else (0, 0, 255)
    
    cv2.putText(image, f"Status: {overall_status}", (10, 40), 
               cv2.FONT_HERSHEY_SIMPLEX, 1.5, status_color, 4)
    
    # Save annotated image
    print(f"Saving annotated image to: {output_path}")
    success = cv2.imwrite(output_path, image)
    if success:
        print(f"Image saved successfully")
        return True
    else:
        print(f"Failed to save image to: {output_path}")
        return False


class MarksheetProcessor:
    """Complete marksheet processing pipeline"""
    
    def __init__(self, logo_model_path="models\\logo.pt", table_model_path="models\\tt_finetuned"):
        """
        Initialize the marksheet processor
        
        Args:
            logo_model_path: Path to logo detection model
            table_model_path: Path to table detection model
        """
        self.logo_model_path = logo_model_path
        self.table_model_path = table_model_path
        
        # Verify model paths exist
        if not os.path.exists(logo_model_path):
            print(f"Warning: Logo model not found at {logo_model_path}")
        
        if not os.path.exists(table_model_path):
            print(f"Warning: Table model not found at {table_model_path}")
    
    def process_single_marksheet(self, image_path, output_dir=None, save_intermediate=False):
        """
        Process a single marksheet through the complete pipeline
        
        Args:
            image_path: Path to input marksheet image
            output_dir: Directory to save results (optional)
            save_intermediate: Whether to save intermediate processing steps (ignored - only saves final annotated image)
            
        Returns:
            dict: Complete processing results
        """
        print(f"\n=== Processing Marksheet: {os.path.basename(image_path)} ===")
        
        # Initialize results dictionary
        results = {
            "input_image": image_path,
            "preprocessing": {},
            "logo_detection": {},
            "face_detection": {},
            "table_detection": {},
            "overall_status": "unknown"
        }
        
        try:
            # Step 1: Preprocessing (cropping only) - save cropped image
            print("Step 1: Preprocessing marksheet (cropping only)...")
            processed_image, original_image, crop_coords = preprocess_marksheet(
                image_path, 
                output_path=None,  # We'll handle saving separately
                save_intermediate=False  # No intermediate saves
            )
            
            # Save the preprocessed (cropped) image
            if output_dir:
                output_path = Path(output_dir)
                output_path.mkdir(exist_ok=True)
                preprocessed_path = output_path / f"{Path(image_path).stem}_preprocessed.jpg"
            else:
                preprocessed_path = Path(image_path).parent / f"{Path(image_path).stem}_preprocessed.jpg"
            
            cv2.imwrite(str(preprocessed_path), processed_image)
            
            results["preprocessing"] = {
                "status": "success",
                "crop_coordinates": crop_coords,
                "processed_image_shape": processed_image.shape,
                "preprocessed_image": str(preprocessed_path)
            }
            
            print(f"✓ Preprocessing completed - Cropped image saved to: {preprocessed_path}")
            
            # Step 2: Logo Detection
            print("Step 2: Detecting board logo...")
            logo_result = detect_logo(image_path, self.logo_model_path)
            
            board_names = {0: "Uttarakhand", 1: "CBSE", 2: "ICSE", -1: "Unknown"}
            board_name = board_names.get(logo_result, "Unknown")
            
            results["logo_detection"] = {
                "status": "success",
                "board_id": logo_result,
                "board_name": board_name,
                "detected": logo_result != -1
            }
            
            print(f"✓ Logo detection completed - Board: {board_name}")
            
            # Step 3: Face Detection
            print("Step 3: Detecting candidate photo...")
            face_result = detect_candidate_photo(image_path, logo_result)
            
            results["face_detection"] = {
                "status": "success",
                "photo_detected": face_result["photo_detected"],
                "board": face_result["board"]
            }
            
            print(f"✓ Face detection completed - Photo detected: {face_result['photo_detected']}")
            
            # Step 4: Table Detection
            print("Step 4: Detecting tables...")
            table_result = detect_tables(
                image_path,
                model_path=self.table_model_path,
                confidence_threshold=0.5,
                info_threshold=0.5,
                marks_threshold=0.8,
                save_results=False,  # No matplotlib popup
                fix_orientation=True
            )
            
            # Get table coordinates and confidence scores for saving
            table_coordinates = []
            if table_result == 1:
                try:
                    from predict_table import detect_tables_with_boxes_and_scores
                    table_data = detect_tables_with_boxes_and_scores(image_path, self.table_model_path)
                    for i, (box, label, confidence) in enumerate(table_data):
                        x1, y1, x2, y2 = box
                        table_type = "Information Table" if label == 0 else "Marks Table"
                        table_coordinates.append({
                            "table_id": i + 1,
                            "table_type": table_type,
                            "confidence": float(confidence),
                            "coordinates": {
                                "x1": float(x1),
                                "y1": float(y1), 
                                "x2": float(x2),
                                "y2": float(y2)
                            },
                            "width": float(x2 - x1),
                            "height": float(y2 - y1)
                        })
                except Exception as e:
                    print(f"Failed to get table coordinates: {e}")
            
            results["table_detection"] = {
                "status": "success",
                "tables_found": table_result,
                "has_tables": table_result == 1,
                "table_coordinates": table_coordinates
            }
            
            print(f"✓ Table detection completed - Tables found: {table_result}")
            
            # Determine overall status (ICSE photo optional)
            is_icse = (board_name == "ICSE")
            if (logo_result != -1 and 
                (face_result["photo_detected"] == 1 or is_icse) and 
                table_result == 1):
                results["overall_status"] = "valid_marksheet"
            elif logo_result == -1:
                results["overall_status"] = "invalid_logo"
            elif table_result == 0:
                results["overall_status"] = "no_tables"
            elif face_result["photo_detected"] == 0 and not is_icse:
                results["overall_status"] = "no_photo"
            else:
                results["overall_status"] = "partial_match"
            
            # Save intermediate detection results as JSON (needed by OCR module)
            if output_dir:
                results_path = output_path / f"{Path(image_path).stem}_result.json"
            else:
                results_path = Path(image_path).parent / f"{Path(image_path).stem}_result.json"
            
            try:
                with open(results_path, 'w') as f:
                    json.dump(results, f, indent=2)
                print(f"✓ Results saved to: {results_path}")
                results["results_file"] = str(results_path)
            except Exception as e:
                print(f"✗ Failed to save results JSON: {e}")
            
            # Persist table coordinates JSON to data/output/table_coordinates
            try:
                table_coords_dir = Path("data/output/table_coordinates")
                table_coords_dir.mkdir(parents=True, exist_ok=True)
                coords_out_path = table_coords_dir / f"{Path(image_path).stem}.json"
                with open(coords_out_path, 'w', encoding='utf-8') as f:
                    json.dump({
                        "file": str(image_path),
                        "table_coordinates": results["table_detection"].get("table_coordinates", [])
                    }, f, indent=2)
                print(f"✓ Table coordinates saved to: {coords_out_path}")
            except Exception as e:
                print(f"✗ Failed to save table coordinates JSON: {e}")

            # Run OCR on detected tables and extract structured data JSON via new module
            try:
                # Lazy import to avoid import-time failures if environment is not set up
                from scripts.ocr import process_image_with_tables as ocr_process_image_with_tables
                from scripts.extractor import create_final_results_dir as extractor_create_results_dir, process_file as extractor_process_file
                # Ensure output dirs used by the new module exist
                extractor_create_results_dir()
                # Generate info and marks text files in ./results using the detection JSON
                ocr_process_image_with_tables(image_path, str(results_path))
                # Use extractor to parse the OCR text files and build final JSON
                base_filename = Path(image_path).stem
                extracted_data = extractor_process_file(base_filename, board_name)
                final_json_path = Path("data/output/final_json") / f"{base_filename}.json"
                if extracted_data:
                    try:
                        with open(final_json_path, 'w', encoding='utf-8') as f:
                            json.dump(extracted_data, f, indent=2, ensure_ascii=False)
                        print(f"✓ Final extracted JSON saved to: {final_json_path}")
                    except Exception as e:
                        print(f"✗ Failed to write final JSON: {e}")
                else:
                    print("✗ Extraction returned no data; final JSON not created")
                results["extraction"] = {
                    "final_json": str(final_json_path),
                    "extracted": extracted_data is not None,
                    "data": extracted_data
                }
            except Exception as e:
                print(f"✗ OCR/Extraction step failed: {e}")
            
            # (Optional) Create and save annotated image - not required for final outputs
            # Keeping this step non-blocking to prioritize requested outputs
            try:
                if output_dir:
                    output_path = Path(output_dir)
                    output_path.mkdir(exist_ok=True)
                    annotated_path = output_path / f"{Path(image_path).stem}_annotated.jpg"
                else:
                    annotated_path = Path(image_path).parent / f"{Path(image_path).stem}_annotated.jpg"
                success = create_annotated_image(
                    image_path, logo_result, face_result, table_result, str(annotated_path),
                    self.logo_model_path, self.table_model_path, board_name
                )
                if success:
                    results["annotated_image"] = str(annotated_path)
                    print(f"✓ Annotated image saved to: {annotated_path}")
            except Exception as e:
                print(f"(Non-blocking) Annotated image creation failed: {e}")
            
            print(f"\n=== Processing Complete ===")
            print(f"Overall Status: {results['overall_status']}")
            print(f"Board: {board_name}")
            print(f"Photo Detected: {face_result['photo_detected']}")
            print(f"Tables Found: {table_result}")
            
        except Exception as e:
            print(f"Error processing marksheet: {e}")
            results["overall_status"] = "error"
            results["error"] = str(e)
        
        return results
    
    def process_batch(self, input_dir, output_dir=None, save_intermediate=False):
        """
        Process all marksheets in a directory
        
        Args:
            input_dir: Directory containing input images
            output_dir: Directory to save results
            save_intermediate: Whether to save intermediate processing steps
            
        Returns:
            list: List of processing results for each image
        """
        input_path = Path(input_dir)
        
        if output_dir is None:
            output_path = input_path / "results"
        else:
            output_path = Path(output_dir)
        
        # Create output directory
        output_path.mkdir(exist_ok=True)
        
        # Get all image files
        image_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions]
        
        if not image_files:
            print(f"No images found in {input_dir}")
            return []
        
        print(f"Processing {len(image_files)} marksheets...")
        
        all_results = []
        
        for i, image_file in enumerate(image_files):
            print(f"\n{'='*60}")
            print(f"Processing {i+1}/{len(image_files)}: {image_file.name}")
            print(f"{'='*60}")
            
            try:
                result = self.process_single_marksheet(
                    str(image_file), 
                    str(output_path), 
                    save_intermediate
                )
                all_results.append(result)
                
                # Save individual result (optional - only if needed for debugging)
                # result_file = output_path / f"{image_file.stem}_result.json"
                # with open(result_file, 'w') as f:
                #     json.dump(result, f, indent=2)
                
            except Exception as e:
                print(f"Error processing {image_file.name}: {e}")
                error_result = {
                    "input_image": str(image_file),
                    "overall_status": "error",
                    "error": str(e)
                }
                all_results.append(error_result)
        
        # Save summary results (optional - only if needed for debugging)
        # summary_file = output_path / "processing_summary.json"
        # with open(summary_file, 'w') as f:
        #     json.dump(all_results, f, indent=2)
        
        # Print summary
        self.print_batch_summary(all_results)
        
        return all_results
    
    def print_batch_summary(self, results):
        """Print summary of batch processing results"""
        print(f"\n{'='*60}")
        print("BATCH PROCESSING SUMMARY")
        print(f"{'='*60}")
        
        total = len(results)
        valid = sum(1 for r in results if r.get("overall_status") == "valid_marksheet")
        invalid_logo = sum(1 for r in results if r.get("overall_status") == "invalid_logo")
        no_photo = sum(1 for r in results if r.get("overall_status") == "no_photo")
        no_tables = sum(1 for r in results if r.get("overall_status") == "no_tables")
        errors = sum(1 for r in results if r.get("overall_status") == "error")
        
        print(f"Total processed: {total}")
        print(f"Valid marksheets: {valid}")
        print(f"Invalid logo: {invalid_logo}")
        print(f"No photo detected: {no_photo}")
        print(f"No tables found: {no_tables}")
        print(f"Errors: {errors}")
        print(f"Success rate: {(valid/total)*100:.1f}%" if total > 0 else "Success rate: 0%")
        
        # Board distribution
        board_counts = {}
        for result in results:
            if "logo_detection" in result:
                board = result["logo_detection"].get("board_name", "Unknown")
                board_counts[board] = board_counts.get(board, 0) + 1
        
        print(f"\nBoard Distribution:")
        for board, count in board_counts.items():
            print(f"  {board}: {count}")


def main():
    """Main function for command-line interface"""
    parser = argparse.ArgumentParser(description="Complete Marksheet Processing Pipeline")
    parser.add_argument("--image", type=str, help="Path to single marksheet image")
    parser.add_argument("--dir", type=str, help="Path to directory of marksheet images")
    parser.add_argument("--output", type=str, help="Output directory for results")
    parser.add_argument("--logo-model", type=str, default="models\\logo.pt",
                       help="Path to logo detection model")
    parser.add_argument("--table-model", type=str, default="models\\tt_finetuned",
                       help="Path to table detection model")
    parser.add_argument("--save-intermediate", action="store_true",
                       help="Save intermediate processing steps")
    
    args = parser.parse_args()
    
    if not args.image and not args.dir:
        print("Please provide either --image or --dir argument")
        print("Example usage:")
        print("  python main.py --image sample_marksheet.jpg")
        print("  python main.py --dir ./marksheets/ --output ./results/")
        return
    
    # Initialize processor
    processor = MarksheetProcessor(args.logo_model, args.table_model)
    
    if args.image:
        if not os.path.exists(args.image):
            print(f"Image not found: {args.image}")
            return
        
        result = processor.process_single_marksheet(
            args.image, 
            args.output, 
            args.save_intermediate
        )
        
        # Print result summary
        print(f"\nFinal Result Summary:")
        print(f"Status: {result['overall_status']}")
        if 'logo_detection' in result:
            print(f"Board: {result['logo_detection']['board_name']}")
        if 'face_detection' in result:
            print(f"Photo Detected: {result['face_detection']['photo_detected']}")
        if 'table_detection' in result:
            tables_found = result['table_detection'].get('tables_found', 'N/A')
            print(f"Tables Found: {tables_found}")
            if 'table_coordinates' in result['table_detection'] and result['table_detection']['table_coordinates']:
                print("Table Coordinates:")
                for table in result['table_detection']['table_coordinates']:
                    coords = table['coordinates']
                    confidence = table.get('confidence', 0.0)
                    print(f"  {table['table_type']}: ({coords['x1']:.0f}, {coords['y1']:.0f}, {coords['x2']:.0f}, {coords['y2']:.0f}) - Confidence: {confidence:.3f}")
        if 'preprocessing' in result and 'preprocessed_image' in result['preprocessing']:
            print(f"Preprocessed Image: {result['preprocessing']['preprocessed_image']}")
        if 'extraction' in result and result['extraction'].get('final_json'):
            print(f"Final JSON: {result['extraction']['final_json']}")
        if 'results_file' in result:
            print(f"Results JSON: {result['results_file']}")
    
    elif args.dir:
        if not os.path.exists(args.dir):
            print(f"Directory not found: {args.dir}")
            return
        
        processor.process_batch(args.dir, args.output, args.save_intermediate)


if __name__ == "__main__":
    main()
