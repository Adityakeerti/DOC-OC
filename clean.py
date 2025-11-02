#!/usr/bin/env python3
import os
import shutil

def clean_directory(path, description):
    """Clean a directory by removing all files and subdirectories"""
    if os.path.exists(path):
        for item in os.listdir(path):
            item_path = os.path.join(path, item)
            try:
                if os.path.isfile(item_path):
                    os.remove(item_path)
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)
            except Exception as e:
                print(f"Error removing {item_path}: {e}")
        print(f"Cleaned {description}: {path}")
    else:
        print(f"Directory not found: {path}")

def main():
    print("Cleaning project directories...")
    
    # Clean data/input
    clean_directory("data/input", "input directory")
    
    # Clean data/output subdirectories
    clean_directory("data/output/ocr_results", "OCR results")
    clean_directory("data/output/table_coordinates", "table coordinates")
    clean_directory("data/output/final_json", "final JSON outputs")
    
    # Clean backend/uploads
    clean_directory("backend/uploads", "backend uploads")
    
    print("Cleanup completed!")

if __name__ == "__main__":
    main()