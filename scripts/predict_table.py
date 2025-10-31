"""Table Detection Inference Script"""
import os
import torch
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image, ImageOps
from transformers import AutoImageProcessor, TableTransformerForObjectDetection
import numpy as np
import argparse

def load_model(model_path="models\tt_finetuned"):
    """Load the fine-tuned model or use pretrained model"""
    print(f"Loading model from: {model_path}")
    
    try:
        processor = AutoImageProcessor.from_pretrained(model_path)
        model = TableTransformerForObjectDetection.from_pretrained(model_path)
        print("Fine-tuned model loaded successfully!")
    except Exception as e:
        print(f"Could not load fine-tuned model: {e}")
        print("Falling back to pretrained model...")
        processor = AutoImageProcessor.from_pretrained("microsoft/table-transformer-detection")
        model = TableTransformerForObjectDetection.from_pretrained("microsoft/table-transformer-detection")
        print("Pretrained model loaded successfully!")
    
    return processor, model

def detect_tables(image_path, processor, model, confidence_threshold=0.5, info_threshold=0.5, marks_threshold=0.8, fix_orientation=True):
    """Detect tables in an image"""
    print(f"Processing image: {image_path}")
    
    # Load and preprocess image
    image = Image.open(image_path)
    if fix_orientation:
        image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")
    
    # Process image
    inputs = processor(images=image, return_tensors="pt")
    
    # Run inference
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Post-process results
    target_sizes = torch.tensor([image.size[::-1]])  # [height, width]
    # Use the minimum of thresholds for initial decoding, then filter per-class below
    decode_threshold = confidence_threshold
    if info_threshold is not None:
        decode_threshold = min(decode_threshold, info_threshold)
    if marks_threshold is not None:
        decode_threshold = min(decode_threshold, marks_threshold)

    results = processor.post_process_object_detection(
        outputs, 
        target_sizes=target_sizes, 
        threshold=decode_threshold
    )[0]

    # Optional per-class thresholding
    if info_threshold is not None or marks_threshold is not None:
        scores = results["scores"]
        labels = results["labels"]
        boxes = results["boxes"]

        keep_indices = []
        for i in range(len(scores)):
            label_id = labels[i].item()
            score_val = scores[i].item()
            thr = info_threshold if label_id == 0 else marks_threshold if label_id == 1 else confidence_threshold
            if thr is None:
                thr = confidence_threshold
            if score_val >= thr:
                keep_indices.append(i)

        if len(keep_indices) != len(scores):
            idx = torch.tensor(keep_indices, dtype=torch.long)
            results = {
                "scores": scores.index_select(0, idx),
                "labels": labels.index_select(0, idx),
                "boxes": boxes.index_select(0, idx),
            }
    
    return image, results

def detect_tables_with_boxes_and_scores(image_path, model_path="models\tt_finetuned", confidence_threshold=0.5, info_threshold=0.5, marks_threshold=0.8, fix_orientation=True):
    """Detect tables in an image and return bounding boxes with confidence scores"""
    processor, model = load_model(model_path)
    image, results = detect_tables(image_path, processor, model, confidence_threshold, info_threshold, marks_threshold, fix_orientation)
    
    boxes_with_labels_and_scores = []
    for i, (score, label, box) in enumerate(zip(results["scores"], results["labels"], results["boxes"])):
        x0, y0, x1, y1 = box.tolist()
        label_id = label.item()
        confidence_score = score.item()
        boxes_with_labels_and_scores.append(([x0, y0, x1, y1], label_id, confidence_score))
    
    return boxes_with_labels_and_scores

def detect_tables_with_boxes(image_path, model_path="models\tt_finetuned", confidence_threshold=0.5, info_threshold=0.5, marks_threshold=0.8, fix_orientation=True):
    """Detect tables in an image and return bounding boxes"""
    processor, model = load_model(model_path)
    image, results = detect_tables(image_path, processor, model, confidence_threshold, info_threshold, marks_threshold, fix_orientation)
    
    boxes_with_labels = []
    for i, (score, label, box) in enumerate(zip(results["scores"], results["labels"], results["boxes"])):
        x0, y0, x1, y1 = box.tolist()
        label_id = label.item()
        boxes_with_labels.append(([x0, y0, x1, y1], label_id))
    
    return boxes_with_labels

def visualize_results(image, results, save_path=None, show_plot=False):
    """Visualize detection results"""
    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    ax.imshow(image)
    ax.set_title("Table Detection Results", fontsize=16)
    
    # Define colors and labels for different table types
    table_colors = {
        0: 'red',      # information_table
        1: 'blue'      # marks_table
    }
    
    table_labels = {
        0: "Information Table",
        1: "Marks Table"
    }
    
    for i, (score, label, box) in enumerate(zip(results["scores"], results["labels"], results["boxes"])):
        x0, y0, x1, y1 = box.tolist()
        width = x1 - x0
        height = y1 - y0
        
        # Get color and label for this table type
        label_id = label.item()
        color = table_colors.get(label_id, 'green')
        table_type = table_labels.get(label_id, f"Table {label_id}")
        
        # Create rectangle
        rect = patches.Rectangle(
            (x0, y0), width, height,
            linewidth=2, edgecolor=color, facecolor='none'
        )
        ax.add_patch(rect)
        
        # Add label with table type
        label_text = f"{table_type}: {score:.2f}"
        ax.text(x0, y0-5, label_text, 
                color=color, fontsize=10, weight='bold',
                bbox=dict(boxstyle="round,pad=0.3", facecolor='white', alpha=0.8))
    
    ax.axis("off")
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Results saved to: {save_path}")
    
    # Removed plt.show() to prevent popup
    
    return fig

def process_single_image(image_path, model_path="models\\tt_finetuned", confidence_threshold=0.5, info_threshold=0.5, marks_threshold=0.8, save_results=True, fix_orientation=True):
    """Process a single image"""
    # Load model
    processor, model = load_model(model_path)
    
    # Detect tables
    image, results = detect_tables(
        image_path, processor, model,
        confidence_threshold=confidence_threshold,
        info_threshold=info_threshold,
        marks_threshold=marks_threshold,
        fix_orientation=fix_orientation,
    )
    
    # Print results
    print(f"\nDetection Results:")
    print(f"Found {len(results['scores'])} tables")
    
    table_counts = {0: 0, 1: 0}  # Count by table type
    for i, (score, label, box) in enumerate(zip(results["scores"], results["labels"], results["boxes"])):
        x0, y0, x1, y1 = box.tolist()
        label_id = label.item()
        table_counts[label_id] += 1
        
        table_type = "Information Table" if label_id == 0 else "Marks Table"
        print(f"  {table_type} {table_counts[label_id]}: confidence={score:.3f}, bbox=({x0:.0f}, {y0:.0f}, {x1:.0f}, {y1:.0f})")
    
    print(f"\nSummary: {table_counts[0]} Information Tables, {table_counts[1]} Marks Tables")
    
    # Visualize results
    if save_results:
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        save_path = f"{base_name}_detection_results.png"
    else:
        save_path = None
    
    visualize_results(image, results, save_path=save_path)
    
    # Return 1 if tables found, 0 if none
    return 1 if len(results['scores']) > 0 else 0

def process_batch_images(image_dir, model_path="models\tt_finetuned", confidence_threshold=0.5, info_threshold=0.5, marks_threshold=0.8, fix_orientation=True):
    """Process all images in a directory"""
    # Load model
    processor, model = load_model(model_path)
    
    # Get all image files
    image_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')
    image_files = [f for f in os.listdir(image_dir) 
                  if f.lower().endswith(image_extensions)]
    
    if not image_files:
        print(f"No images found in {image_dir}")
        return
    
    print(f"Processing {len(image_files)} images...")
    
    results_summary = []
    
    for i, image_file in enumerate(image_files):
        print(f"\n--- Processing {i+1}/{len(image_files)}: {image_file} ---")
        
        image_path = os.path.join(image_dir, image_file)
        
        try:
            # Detect tables
            image, results = detect_tables(
                image_path, processor, model,
                confidence_threshold=confidence_threshold,
                info_threshold=info_threshold,
                marks_threshold=marks_threshold,
                fix_orientation=fix_orientation,
            )
            
            # Save results
            base_name = os.path.splitext(image_file)[0]
            save_path = os.path.join(image_dir, f"{base_name}_detection_results.png")
            
            visualize_results(image, results, save_path=save_path, show_plot=False)
            
            # Count tables by type
            table_counts = {0: 0, 1: 0}
            for label in results['labels']:
                table_counts[label.item()] += 1
            
            # Store summary
            results_summary.append({
                'file': image_file,
                'tables_found': len(results['scores']),
                'information_tables': table_counts[0],
                'marks_tables': table_counts[1],
                'max_confidence': float(results['scores'].max()) if len(results['scores']) > 0 else 0.0
            })
            
        except Exception as e:
            print(f"Error processing {image_file}: {e}")
            results_summary.append({
                'file': image_file,
                'tables_found': 0,
                'information_tables': 0,
                'marks_tables': 0,
                'max_confidence': 0.0,
                'error': str(e)
            })
    
    # Print summary
    print("\n" + "="*60)
    print("BATCH PROCESSING SUMMARY")
    print("="*60)
    
    total_tables = 0
    total_info_tables = 0
    total_marks_tables = 0
    
    for result in results_summary:
        print(f"{result['file']:<30} | Total: {result['tables_found']:<3} | Info: {result['information_tables']:<3} | Marks: {result['marks_tables']:<3} | Max Conf: {result['max_confidence']:.3f}")
        total_tables += result['tables_found']
        total_info_tables += result['information_tables']
        total_marks_tables += result['marks_tables']
    
    print(f"\nTotal tables detected: {total_tables}")
    print(f"  - Information Tables: {total_info_tables}")
    print(f"  - Marks Tables: {total_marks_tables}")
    print(f"Average tables per image: {total_tables/len(image_files):.2f}")
    
    # Return 1 if any tables found, 0 if none
    return 1 if total_tables > 0 else 0

def main():
    parser = argparse.ArgumentParser(description="Table Detection Inference")
    parser.add_argument("--image", type=str, help="Path to single image")
    parser.add_argument("--dir", type=str, help="Path to directory of images")
    parser.add_argument("--model", type=str, default="models\tt_finetuned", 
                       help="Path to fine-tuned model (default: models\tt_finetuned)")
    parser.add_argument("--confidence", type=float, default=0.5,
                       help="Confidence threshold (default: 0.5)")
    parser.add_argument("--info-thresh", type=float, default=0.5,
                       help="Per-class threshold for Information Table (class 0) (default: 0.5)")
    parser.add_argument("--marks-thresh", type=float, default=0.8,
                       help="Per-class threshold for Marks Table (class 1) (default: 0.8)")
    parser.add_argument("--no-fix-orientation", action="store_true",
                       help="Disable EXIF orientation fix for images")
    parser.add_argument("--no-save", action="store_true",
                       help="Don't save visualization results")
    
    args = parser.parse_args()
    
    if not args.image and not args.dir:
        print("Please provide either --image or --dir argument")
        print("Example usage:")
        print("  python predict_table.py --image sample.jpg")
        print("  python predict_table.py --dir ./test_images/")
        return
    
    if args.image:
        if not os.path.exists(args.image):
            print(f"Image not found: {args.image}")
            return
        
        result = process_single_image(
            args.image, 
            args.model, 
            args.confidence, 
            info_threshold=args.info_thresh,
            marks_threshold=args.marks_thresh,
            save_results=not args.no_save,
            fix_orientation=not args.no_fix_orientation,
        )
        exit(result)
    
    elif args.dir:
        if not os.path.exists(args.dir):
            print(f"Directory not found: {args.dir}")
            return
        
        result = process_batch_images(
            args.dir, args.model, args.confidence,
            info_threshold=args.info_thresh,
            marks_threshold=args.marks_thresh,
            fix_orientation=not args.no_fix_orientation,
        )
        exit(result)

if __name__ == "__main__":
    main()
