import os
import re
import json
import tempfile
from typing import Tuple, Optional, Dict, Any
from pathlib import Path
from PIL import Image

from scripts.ocr import process_ocr

def _clean(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    text = re.sub(r"\s+", " ", str(text)).strip()
    return text or None

def crop_by_norm_box(image_path: str, norm_box: Tuple[float, float, float, float], margin_ratio: float = 0.02) -> Image.Image:
    with Image.open(image_path) as img:
        w, h = img.width, img.height
        cx, cy, bw, bh = norm_box
        x1 = int(round((cx - bw/2) * w))
        y1 = int(round((cy - bh/2) * h))
        x2 = int(round((cx + bw/2) * w))
        y2 = int(round((cy + bh/2) * h))
        pad_x = int(round((x2 - x1) * margin_ratio))
        pad_y = int(round((y2 - y1) * margin_ratio))
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)
        return img.crop((x1, y1, x2, y2)).convert('RGB')

def save_txt(dirpath: str, stem: str, suffix: str, text: str) -> str:
    os.makedirs(dirpath, exist_ok=True)
    out = os.path.join(dirpath, f"{stem}_{suffix}.txt")
    with open(out, 'w', encoding='utf-8') as f:
        f.write(text)
    return out

def _roman_from_text(text: str) -> Optional[str]:
    m = re.search(r"\b([IVXLCDM]+)\b\s*SEMESTER", text, re.IGNORECASE)
    return m.group(1).upper() if m else None

def extract_student_name_info(info_text: str) -> Optional[str]:
    # Looks for a line containing 'Name of Student' and captures only the name
    m = re.search(r"Name\s*of\s*Student\s*:?\s*([A-Z .']+?)(?:\s+Enrol|$)", info_text, re.IGNORECASE)
    if m and m.group(1):
        return _clean(m.group(1))
    # Fallback - strict: only first word after 'Name of Student'
    m = re.search(r"Name\s*of\s*Student\s*:?\s*([A-Z .']+)", info_text, re.IGNORECASE)
    if m and m.group(1):
        val = _clean(m.group(1))
        # Defensive: strip common trailing artifacts
        return re.sub(r"\s*(Enrolment|Enrollment|Roll).*$", "", val, flags=re.IGNORECASE).strip()
    return None

def extract_father_name(text: str) -> Optional[str]:
    # Capture father's name but stop before tokens like Roll/Enrol on same line
    m = re.search(r"Father'?s\s+Name\s*:?.?\s*([A-Z ]+?)(?:\s+(?:Roll|Enrol|Enrollment|Enrolment)\b|$)", text, re.IGNORECASE)
    if m and m.group(1):
        return _clean(m.group(1))
    m = re.search(r"Father'?s\s+Name\s*:?.?\s*([A-Z ]+)", text, re.IGNORECASE)
    if m and m.group(1):
        return _clean(m.group(1))
    return None

def parse_college_texts(info_text: str, marks_text: str) -> Dict[str, Any]:
    # Remove college name from output section
    # If needed, can infer but NOT set in JSON

    # Course, semester, session from header
    course, session, header_line = None, None, None
    for ln in info_text.splitlines():
        if re.search(r"BACHELOR|MASTER|DIPLOMA|\bB\.?TECH\b|\bM\.?TECH\b", ln, re.IGNORECASE):
            header_line = ln
            break
    if header_line:
        course = header_line.strip()
        m = re.search(r"\((\d{4}\s*[-/]\s*\d{2})\)", header_line)
        if m:
            session = m.group(1).replace(" ", "")

    sem_roman = _roman_from_text(info_text) or _roman_from_text(marks_text)

    # Student details
    name_val = extract_student_name_info(info_text)
    file_father_name = extract_father_name(info_text) or extract_father_name(marks_text)

    m = re.search(r"Roll\s*No\s*:?\s*([A-Z0-9\-/]+)", info_text, re.IGNORECASE)
    roll_no = _clean(m.group(1)) if m else None

    m = re.search(r"Enrol?ment\s*No\s*:?\s*([A-Z0-9\-/]+)", info_text, re.IGNORECASE)
    enrollment_no = _clean(m.group(1)) if m else None

    data: Dict[str, Any] = {
        "college": {
            "course": course,
            "semester": sem_roman,
            "session": session
        },
        "student": {
            "name": name_val,
            "father_name": file_father_name,
            "enrollment_no": enrollment_no,
            "roll_no": roll_no,
        },
        "subjects": [],
        "result": {
            "total_credits_registered": None,
            "total_credits_earned": None,
            "sgpa": None,
            "cgpa": None,
            "status": None,
        }
    }

    # Table parsing: capture trailing marks segment so we can derive internal/external
    raw_lines = [ln for ln in marks_text.splitlines() if ln.strip()]
    rows = [re.sub(r"\s+", " ", ln.strip()) for ln in raw_lines]

    subj_pat = re.compile(
        r"^(?P<code>[A-Z]{2,4}\d{3})\s+(?P<name>[A-Z0-9 &().,\-]+?)\s+(?P<credits>\d)\s+"
        r"(?P<trail>.*?)(?P<total>\d{2,3})\s+(?P<grade>[A-Za-z][+]?|O)?\s*(?P<gp>\d+(?:\.[\d]+)?)?$",
        re.IGNORECASE,
    )

    def toi(x: Optional[str]) -> Optional[int]:
        try:
            return int(x) if x is not None else None
        except Exception:
            return None

    def map_grade_from_gp(gp_val: Optional[str]) -> Optional[str]:
        if not gp_val:
            return None
        try:
            gp = float(gp_val)
        except Exception:
            return None
        if gp >= 9.5:
            return 'O'
        if gp >= 8.5:
            return 'A+'
        if gp >= 7.5:
            return 'A'
        if gp >= 6.5:
            return 'B+'
        if gp >= 5.5:
            return 'B'
        if gp >= 4.5:
            return 'C'
        if gp >= 4.0:
            return 'P'
        return 'F'

    for ln in rows:
        m = subj_pat.match(ln)
        if not m:
            continue
        gd = m.groupdict()
        code = gd.get('code')
        name = gd.get('name')
        credits = gd.get('credits')
        tot = gd.get('total')
        grade = gd.get('grade')
        gp = gd.get('gp')
        trail = gd.get('trail') or ''

        # Extract obtained marks from trail (Max, Obt pairs)
        nums = [int(x) for x in re.findall(r"\d{1,3}", trail)]
        obtaineds = [nums[i] for i in range(1, len(nums), 2)] if len(nums) >= 2 else []
        internal_marks = None
        external_marks = None
        if obtaineds:
            if len(obtaineds) >= 2:
                internal_marks = sum(obtaineds[:-1])
                external_marks = obtaineds[-1]
            else:
                internal_marks = 0
                external_marks = obtaineds[0]

        if not grade and gp:
            grade = map_grade_from_gp(gp)

        data["subjects"].append({
            "code": _clean(code),
            "name": _clean(name),
            "credits": toi(credits),
            "internal_marks": toi(internal_marks),
            "external_marks": toi(external_marks),
            "total": toi(tot),
            "grade": _clean(grade),
            "grade_point": float(gp) if gp else None,
        })

    # Footer results
    m = re.search(r"SGPA\s*[:=]?\s*(\d+(?:\.\d+)?)", marks_text, re.IGNORECASE)
    if m:
        data["result"]["sgpa"] = float(m.group(1))
    m = re.search(r"Total\s+No\.\s+of\s+Credits\s+registered\s*[:=]?\s*(\d+)", marks_text, re.IGNORECASE)
    if m:
        data["result"]["total_credits_registered"] = int(m.group(1))
    m = re.search(r"Total\s+No\.\s+of\s+Credits\s+earned\s*[:=]?\s*(\d+)", marks_text, re.IGNORECASE)
    if m:
        data["result"]["total_credits_earned"] = int(m.group(1))
    m = re.search(r"Result\s*[:=]?\s*([A-Z ]+)", marks_text, re.IGNORECASE)
    if m:
        data["result"]["status"] = _clean(m.group(1)).upper()

    return data

def process_fixed_format(
    image_path: str,
    info_norm_box: Tuple[float, float, float, float],
    marks_norm_box: Tuple[float, float, float, float],
) -> Dict[str, Any]:
    stem = Path(image_path).stem
    ocr_dir = os.path.join("data", "output", "ocr_results")
    final_dir = os.path.join("data", "output", "final_json")
    coords_dir = os.path.join("data", "output", "table_coordinates")
    os.makedirs(ocr_dir, exist_ok=True)
    os.makedirs(final_dir, exist_ok=True)
    os.makedirs(coords_dir, exist_ok=True)

    with open(os.path.join(coords_dir, f"{stem}.json"), 'w', encoding='utf-8') as f:
        json.dump({
            "file": image_path,
            "table_coordinates": [
                {"table_id": 1, "table_type": "Information Table", "normalized": info_norm_box},
                {"table_id": 2, "table_type": "Marks Table", "normalized": marks_norm_box},
            ]
        }, f, indent=2)

    info_img = crop_by_norm_box(image_path, info_norm_box)
    marks_img = crop_by_norm_box(image_path, marks_norm_box)

    with tempfile.TemporaryDirectory() as td:
        info_tmp = os.path.join(td, f"{stem}_info.jpg")
        marks_tmp = os.path.join(td, f"{stem}_marks.jpg")
        info_img.save(info_tmp, format='JPEG')
        marks_img.save(marks_tmp, format='JPEG')
        info_text = process_ocr(info_tmp)
        marks_text = process_ocr(marks_tmp)

    save_txt(ocr_dir, stem, "info", info_text)
    save_txt(ocr_dir, stem, "marks", marks_text)

    data = parse_college_texts(info_text, marks_text)
    out_json = os.path.join(final_dir, f"{stem}.json")
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return data
