import re
import json
import os
from typing import Dict, List, Optional, Any

def create_final_results_dir():
    """Create final_json directory if it doesn't exist"""
    final_dir = os.path.join("data", "output", "final_json")
    if not os.path.exists(final_dir):
        os.makedirs(final_dir, exist_ok=True)
        print("Created final_json directory")

def clean_text(text: str) -> Optional[str]:
    """Clean and normalize text"""
    if not text:
        return None
    cleaned = re.sub(r'\s+', ' ', text.strip())
    return cleaned if cleaned else None

def digits_to_words(digits: int) -> str:
    """
    Convert digits to words character by character.
    Example: 69 becomes "SIX NINE", 91 becomes "NINE ONE"
    """
    digit_words = {
        '0': 'ZERO', '1': 'ONE', '2': 'TWO', '3': 'THREE', '4': 'FOUR',
        '5': 'FIVE', '6': 'SIX', '7': 'SEVEN', '8': 'EIGHT', '9': 'NINE'
    }
    digits_str = str(digits)
    words = [digit_words[digit] for digit in digits_str]
    return ' '.join(words)

def extract_cbse_data(info_text: str, marks_text: str) -> Dict[str, Any]:
    """
    Robust CBSE board extractor handling missing, 'xxx', or empty practical marks fields.
    """
    result = {
        "board": "CBSE",
        "student_name": None,
        "roll_number": None,
        "mother_name": None,
        "father_name": None,
        "school_name": None,
        "school_code": None,
        "subjects": []
    }

    # Enhanced info extraction with multiple patterns
    # Name extraction with multiple patterns
    name_match = re.search(r'Name of Candidate\s+([A-Z][A-Z ]+)', info_text)
    if not name_match:
        name_match = re.search(r'This is to certify that\s+([A-Z][A-Z ]+)', info_text)
    if not name_match:
        # Look for name before "has achieved" or similar phrases
        name_match = re.search(r'([A-Z][A-Z ]+)\s+(?:has achieved|की शैक्षणिक)', info_text)
    result["student_name"] = clean_text(name_match.group(1)) if name_match else None
    
    # Roll number with flexible patterns
    roll_match = re.search(r'Roll No\.?\s*(\d+)', info_text)
    if not roll_match:
        roll_match = re.search(r'अनुक्रमांक\s*(\d+)', info_text)
    result["roll_number"] = roll_match.group(1) if roll_match else None
    
    # Mother's name with multiple patterns
    mother_match = re.search(r"Mother'?s Name\s+([A-Z][A-Z ]+)", info_text)
    if not mother_match:
        mother_match = re.search(r"माता का नाम\s+([A-Z][A-Z ]+)", info_text)
    result["mother_name"] = clean_text(mother_match.group(1)) if mother_match else None
    
    # Father's name with multiple patterns
    father_match = re.search(r"Father'?s/Guardian'?s Name\s+([A-Z][A-Z ]+)", info_text)
    if not father_match:
        father_match = re.search(r"Father'?s Name\s+([A-Z][A-Z ]+)", info_text)
    if not father_match:
        father_match = re.search(r"पिता /संरक्षक का नाम\s+([A-Z][A-Z ]+)", info_text)
    result["father_name"] = clean_text(father_match.group(1)) if father_match else None
    
    # School information with enhanced patterns
    school_match = re.search(r'School\s*(\d{5})\s*-?\s*([A-Z][A-Z &\-,\.]+)', info_text)
    if not school_match:
        school_match = re.search(r'विद्यालय\s*(\d{5})\s*-?\s*([A-Z][A-Z &\-,\.]+)', info_text)
    if not school_match:
        school_match = re.search(r'(\d{5})\s*-?\s*([A-Z][A-Z &\-,\.]+)', info_text)
    if school_match:
        result["school_code"] = school_match.group(1)
        result["school_name"] = clean_text(school_match.group(2))

    # Enhanced marks pattern with better subject name capture
    marks_pattern = re.compile(
        r'^\s*(\d{3})\s+([A-Z][A-Z &\-\.]+?)\s+([0-9]{2,3}|xxx)?\s+([0-9]{2,3}|xxx)?\s+([0-9]{2,3})?\s+([A-Z ]+(?:[A-Z]+)?)?\s*([A-Z]\d)?\s*$'
    )

    for line in marks_text.splitlines():
        sub_match = marks_pattern.match(line)
        if sub_match:
            code = sub_match.group(1)
            name = clean_text(sub_match.group(2))
            theory_raw = sub_match.group(3)
            practical_raw = sub_match.group(4)
            total_raw = sub_match.group(5)
            total_words = clean_text(sub_match.group(6)) if sub_match.group(6) else None
            grade = sub_match.group(7)

            def parse_mark(x):
                if x and x.lower() != "xxx":
                    return int(x)
                return None

            total_marks_value = parse_mark(total_raw)
            subject = {
                "code": code,
                "name": name,
                "theory_marks": parse_mark(theory_raw),
                "practical_marks": parse_mark(practical_raw),
                "total_marks": total_marks_value,
                "total_in_words": digits_to_words(total_marks_value) if total_marks_value is not None else None,
                "grade": grade if grade else None
            }
            # Only add subjects with a code and name (avoid noise)
            if code and name:
                result["subjects"].append(subject)

    return result

def extract_uttarakhand_data(info_text: str, marks_text: str) -> Dict[str, Any]:
    """Extract data from Uttarakhand board marksheet"""
    result = {
        "board": "UTTARAKHAND",
        "student_name": None,
        "mother_name": None,
        "father_name": None,
        "school_name": None,
        "subjects": []
    }

    # Name extraction with multiple patterns
    name_match = re.search(r'according to the Board\'s record\s+([A-Z][A-Z ]+)', info_text)
    if not name_match:
        name_match = re.search(r'परिषद् के अभिलेखानुसार\s+([^\n]+)\n[^\n]*\s+([A-Z][A-Z ]+)', info_text)
        if name_match:
            result["student_name"] = clean_text(name_match.group(2))
        else:
            result["student_name"] = None
    else:
        result["student_name"] = clean_text(name_match.group(1))

    # Mother's name
    mother_match = re.search(r'Son/Daughter of Mrs\.\s+([A-Z][A-Z ]+)', info_text)
    if not mother_match:
        mother_match = re.search(r'आत्मज/आत्मजा श्रीमती\s+[^\n]*\s+([A-Z][A-Z ]+)', info_text)
    result["mother_name"] = clean_text(mother_match.group(1)) if mother_match else None

    # Father's name
    father_match = re.search(r'and Mr\.\s+([A-Z][A-Z ]+)', info_text)
    if not father_match:
        father_match = re.search(r'एवं श्री\s+[^\n]*\s+([A-Z][A-Z ]+)', info_text)
    result["father_name"] = clean_text(father_match.group(1)) if father_match else None

    # School name
    school_match = re.search(r'from School\s+([A-Z][A-Z\.\s]+)', info_text)
    result["school_name"] = clean_text(school_match.group(1)) if school_match else None

    # Marks extraction for Uttarakhand format
    for line in marks_text.splitlines():
        line = line.strip()
        if not line or re.search(r'(SUBJECT|GRADE|PASSED|RESULT|POSITIONAL|ADDITIONAL SUBJECT|DATED)', line):
            continue
            
        # Pattern for subject lines: code + name + marks
        subject_match = re.match(r'^(\d{3})\s+([A-Z][A-Z ]+?)\s+(.*)', line)
        if subject_match:
            code = subject_match.group(1)
            name = clean_text(subject_match.group(2))
            marks_part = subject_match.group(3)
            
            # Extract all numbers from marks part
            marks_list = [int(x) for x in re.findall(r'\d{2,3}', marks_part)]
            
            theory = practical = internal = total = None
            
            # Parse based on subject type and number of marks
            if name == 'SOCIAL SCIENCE' and len(marks_list) >= 3:
                theory, internal, total = marks_list[0], marks_list[1], marks_list[2]
            elif name in ['MATHEMATICS', 'SCIENCE'] and len(marks_list) >= 3:
                theory, practical, total = marks_list[0], marks_list[1], marks_list[2]
            elif len(marks_list) >= 2:
                theory, total = marks_list[0], marks_list[-1]
            elif len(marks_list) == 1:
                theory = total = marks_list[0]
            
            if code and name:
                result["subjects"].append({
                    "code": code,
                    "name": name,
                    "theory_marks": theory,
                    "practical_marks": practical,
                    "internal_marks": internal,
                    "total_marks": total,
                    "marks_in_words": digits_to_words(total) if total is not None else None,
                    "grade": None
                })

    return result

def extract_icse_data(info_text: str, marks_text: str):
    result = {
        "board": "ICSE",
        "student_name": None,
        "unique_id": None,
        "mother_name": None,
        "father_name": None,
        "school_name": None,
        "subjects": []
    }

    # Info extraction (unchanged, robust multi-pattern)
    name_patterns = [
        r'Name\s+([A-Z\s]+)\s+of',
        r'Name\s+([A-Z\s]+)\b',
        r'^([A-Z\s]+)\s+of\s+[A-Z\s,]+'
    ]
    for pattern in name_patterns:
        name_match = re.search(pattern, info_text)
        if name_match:
            result['student_name'] = clean_text(name_match.group(1))
            break

    id_match = re.search(r'UNIQUE ID\s*(\d{7,8})', info_text, re.IGNORECASE)
    if not id_match:
        id_match = re.search(r'Unique ID\s*(\d{7,8})', info_text, re.IGNORECASE)
    if id_match:
        result['unique_id'] = id_match.group(1)

    # Extract mother and father names based on "Daughter of" or "Son of" pattern
    # Format: "Daughter of\nSmt ...\nShri ..."
    info_lines = info_text.split('\n')
    daughter_son_found = False
    for i, line in enumerate(info_lines):
        if re.search(r'(Daughter|Son)\s+of', line, re.IGNORECASE):
            daughter_son_found = True
            # Next non-empty line is mother's name
            for j in range(i+1, min(i+5, len(info_lines))):
                mother_line = info_lines[j].strip()
                if mother_line and re.match(r'(Smt|Mrs\.)', mother_line, re.IGNORECASE):
                    # Extract name after Smt/Mrs
                    mother_name = re.sub(r'^(Smt|Mrs\.)\s+', '', mother_line, flags=re.IGNORECASE)
                    result['mother_name'] = clean_text(mother_name)
                    break
            
            # Line after mother is father's name
            for j in range(i+1, min(i+5, len(info_lines))):
                father_line = info_lines[j].strip()
                if father_line and re.match(r'(Shri|Mr\.)', father_line, re.IGNORECASE):
                    # Extract name after Shri/Mr
                    father_name = re.sub(r'^(Shri|Mr\.)\s+', '', father_line, flags=re.IGNORECASE)
                    result['father_name'] = clean_text(father_name)
                    break
            break

    # Get school name - extract text after "of" until we hit UNIQUE or <<<
    school_match = re.search(r'of\s+([A-Z][A-Z\s\.&,]+?)(?=\n\s*[Uu]nique|<<<)', info_text, re.DOTALL)
    if school_match:
        school_part = school_match.group(1).strip()
        result['school_name'] = clean_text(school_part)

    # Split lines and process
    lines = marks_text.split('\n')
    
    in_subject_section = False
    subjects = []
    
    for line in lines:
        original_line = line
        
        # Collapse multiple spaces/tabs to single space for pattern matching
        normalized = re.sub(r'\s+', ' ', line.strip())
        if not normalized:
            continue
            
        # Table/subject section start for both formats
        # Look in the original line for better header detection (preserve spacing)
        if re.search(r'(SUBJECTS|External Examination|Percentage Mark)', original_line, re.IGNORECASE):
            in_subject_section = True
            continue
        
        # If we haven't started the subject section yet, check if this is a subject line
        if not in_subject_section:
            # Check if this looks like a subject line (starts with uppercase letters, has numbers)
            if re.match(r'^[A-Z][A-Z &,.\'-]+\s+\d', normalized):
                in_subject_section = True
            else:
                continue
        
        # Use normalized line for pattern matching
        line = normalized

        # Defensive noise skip - skip lines with these keywords
        if re.search(r'(UNIQUE ID|Daughter|Smt|Shri|Mother|Father|Internal Assessment|GRADE|Date of birth|Head of the School|registration|COMMUNITY SERVICE|SUPW|NEW DELHI)', line, re.IGNORECASE):
            continue

        # More flexible patterns that split on numeric markers
        
        # Pattern 1: ICSE2 format with double marks - "HINDI 092 92 NINE TWO"
        m = re.search(r'^([A-Z][A-Z &,.\'-]+?)\s+(\d{3})\s+(\d{2,3})\s+([A-Z]+(?:\s+[A-Z]+)+)$', line)
        if m:
            subject_name = clean_text(m.group(1))
            marks = int(m.group(2))  # Use first number
            subjects.append({
                "name": subject_name,
                "marks": marks,
                "marks_in_words": digits_to_words(marks)
            })
            continue

        # Pattern 2: ICSE2 format - "ENGLISH 80 EIGHT ZERO" or "MATHEMATICS 089 89 EIGHT NINE"
        m = re.search(r'^([A-Z][A-Z &,.\'-]+?)\s+(\d{2,3})\s+([A-Z]+(?:\s+[A-Z]+)+)$', line)
        if m:
            subject_name = clean_text(m.group(1))
            marks = int(m.group(2))
            subjects.append({
                "name": subject_name,
                "marks": marks,
                "marks_in_words": digits_to_words(marks)
            })
            continue

        # Pattern 3: ICSE1 format - subject with marks, single word marks_in_words, and grade
        # Check single-word pattern first to avoid ambiguity
        # e.g., "MATHEMATICS 79 SEVKN N" or "PHYSICS 83 EIGHT T"
        m = re.search(r'^([A-Z][A-Z &,.\'-]+?)\s+(\d{2,3})\s+([A-Z]+)\s+([A-Z])\s*$', line)
        if m and len(m.group(3)) > 3:  # marks_in_words should be substantial
            subject_name = clean_text(m.group(1))
            marks = int(m.group(2))
            subjects.append({
                "name": subject_name,
                "marks": marks,
                "marks_in_words": digits_to_words(marks)
            })
            continue

        # Pattern 4: ICSE1 format - subject with marks, multi-word marks_in_words, and grade
        # Handles cases with multiple words for marks followed by grade
        m = re.search(r'^([A-Z][A-Z &,.\'-]+?)\s+(\d{2,3})\s+([A-Z]+(?:\s+[A-Z]+)+)\s+([A-Z])\s*$', line)
        if m:
            subject_name = clean_text(m.group(1))
            marks = int(m.group(2))
            subjects.append({
                "name": subject_name,
                "marks": marks,
                "marks_in_words": digits_to_words(marks)
            })
            continue

        # Pattern 5: ICSE1/ICSE2 sub-subjects with leading zero - "ENGLISH LANGUAGE 076"
        m = re.search(r'^([A-Z][A-Z &,.\'-]+?)\s+0?(\d{2,3})\s*$', line)
        if m:
            subject_name = clean_text(m.group(1))
            marks_str = m.group(2)
            marks = int(marks_str)
            subjects.append({
                "name": subject_name,
                "marks": marks,
                "marks_in_words": digits_to_words(marks)
            })
            continue


    # Deduplicate by name - keep first occurrence
    seen = set()
    deduped = []
    for subj in subjects:
        if subj["name"] and subj["name"] not in seen:
            deduped.append(subj)
            seen.add(subj["name"])

    result['subjects'] = deduped
    return result



def normalize_board_name(board_name: str) -> str:
    if not board_name:
        return 'unknown'
    name = board_name.strip().lower()
    if 'cbse' in name:
        return 'cbse'
    if 'icse' in name:
        return 'icse'
    if 'uttarakhand' in name or 'uk' in name:
        return 'uttarakhand'
    return name

def process_file(filename: str, board_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    results_dir = os.path.join("data", "output", "ocr_results")
    info_file = os.path.join(results_dir, f"{filename}_info.txt")
    marks_file = os.path.join(results_dir, f"{filename}_marks.txt")

    if not os.path.exists(info_file) or not os.path.exists(marks_file):
        print(f"Warning: Missing files for {filename}")
        return None

    with open(info_file, 'r', encoding='utf-8') as f:
        info_text = f.read()

    with open(marks_file, 'r', encoding='utf-8') as f:
        marks_text = f.read()

    board_type = normalize_board_name(board_name or '')

    if board_type == 'cbse':
        return extract_cbse_data(info_text, marks_text)
    elif board_type == 'icse':
        return extract_icse_data(info_text, marks_text)
    elif board_type == 'uttarakhand':
        return extract_uttarakhand_data(info_text, marks_text)
    else:
        print(f"Unknown board type for {filename}; provided: '{board_name}'")
        return None

def main():
    create_final_results_dir()

    results_dir = "results"
    if not os.path.exists(results_dir):
        print(f"Error: {results_dir} directory not found!")
        return

    info_files = [f for f in os.listdir(results_dir) if f.endswith('_info.txt')]

    if not info_files:
        print("No info files found in results directory!")
        return

    print(f"Found {len(info_files)} files to process")
    print("=" * 50)

    processed_count = 0

    for info_file in info_files:
        filename = info_file.replace('_info.txt', '')
        print(f"Processing: {filename}")

        try:
            extracted_data = process_file(filename)

            if extracted_data:
                output_file = os.path.join("data", "output", "final_json", f"{filename}.json")
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(extracted_data, f, indent=2, ensure_ascii=False)

                print(f"  OK: Saved to: {output_file}")
                print(f"  OK: Student: {extracted_data.get('student_name', 'N/A')}")
                print(f"  OK: Subjects: {len(extracted_data.get('subjects', []))}")
                processed_count += 1
            else:
                print(f"  FAILED: Failed to extract data")

        except Exception as e:
            print(f"  FAILED: Error processing {filename}: {e}")

        print("-" * 30)

    print(f"Processing completed! {processed_count}/{len(info_files)} files processed successfully.")

if __name__ == "__main__":
    main()