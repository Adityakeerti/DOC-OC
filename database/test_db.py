#!/usr/bin/env python3
"""
Test database operations with full JSON extraction
"""
from db_config import MarksheetDB

def test_database():
    db = MarksheetDB()
    
    # Test user creation or get existing
    print("Testing user creation...")
    user = db.get_user_by_email("test@example.com")
    if user:
        user_id = user['user_id']
        print(f"Using existing user with ID: {user_id}")
    else:
        user_id = db.create_user("testuser2", "test@example.com")
        if user_id:
            print(f"User created with ID: {user_id}")
        else:
            print("Failed to create user")
            return
    
    # Test CBSE 12th marksheet
    print("Testing CBSE 12th marksheet...")
    cbse_data = {
        "board": "CBSE",
        "student_name": "SATYAM JHA",
        "roll_number": "17610283",
        "mother_name": "RINKU DEVI",
        "father_name": "AMOD JHA",
        "school_name": "DOON B PUB SR SEC SCHOOL SEHATPUR FARIDABAD HRY",
        "school_code": "40793",
        "subjects": [
            {
                "code": "301",
                "name": "ENGLISH CORE",
                "theory_marks": 74,
                "practical_marks": 17,
                "total_marks": 91,
                "total_in_words": "NINE ONE",
                "grade": "A2"
            },
            {
                "code": "054",
                "name": "BUSINESS STUDIES",
                "theory_marks": 62,
                "practical_marks": 20,
                "total_marks": 82,
                "total_in_words": "EIGHT TWO",
                "grade": "B1"
            }
        ]
    }
    
    result = db.save_12th_marksheet(user_id, cbse_data)
    if result:
        print(f"CBSE 12th marksheet saved with ID: {result}")
    else:
        print("Failed to save CBSE 12th marksheet")
    
    # Test ICSE 10th marksheet
    print("Testing ICSE 10th marksheet...")
    icse_data = {
        "board": "ICSE",
        "student_name": "MUGASATI SRIMEGHANA",
        "unique_id": "6948120",
        "mother_name": "MUGASATI ANANTHA LAKSHMI",
        "father_name": "MUGASATI VENKATA RAJU",
        "subjects": [
            {
                "name": "ENGLISH",
                "marks": 91,
                "marks_in_words": "NINE ONE"
            },
            {
                "name": "MATHEMATICS",
                "marks": 79,
                "marks_in_words": "SEVEN NINE"
            }
        ]
    }
    
    result = db.save_10th_marksheet(user_id, icse_data)
    if result:
        print(f"ICSE 10th marksheet saved with ID: {result}")
    else:
        print("Failed to save ICSE 10th marksheet")
    
    # Test college marksheet
    print("Testing college marksheet...")
    college_data = {
        "college": {
            "course": "BACHELOR OF TECHNOLOGY - I SEMESTER EXAMINATION (2023-24)",
            "semester": "I",
            "session": "2023-24"
        },
        "student": {
            "name": "ADITYAKEERTI",
            "father_name": "SHYAMA CHARAN",
            "enrollment_no": "PV-23180236",
            "roll_no": "2318236"
        },
        "subjects": [
            {
                "code": "TPH101",
                "name": "Engineering Physics",
                "credits": 3,
                "internal_marks": 39,
                "external_marks": 15,
                "total": 54,
                "grade": "B",
                "grade_point": 6.0
            },
            {
                "code": "TEE101",
                "name": "Basic Electrical Engineering",
                "credits": 2,
                "internal_marks": 24,
                "external_marks": 29,
                "total": 53,
                "grade": "B",
                "grade_point": 6.0
            }
        ],
        "result": {
            "total_credits_registered": 22,
            "total_credits_earned": 22,
            "sgpa": 6.82,
            "status": "PASS"
        }
    }
    
    result = db.save_college_marksheet(user_id, 1, college_data)
    if result:
        print(f"College marksheet saved with ID: {result}")
    else:
        print("Failed to save college marksheet")
    
    # Test retrieving all marksheets
    print("Testing marksheet retrieval...")
    marksheets = db.get_user_marksheets(user_id)
    if marksheets:
        print("Retrieved marksheets:")
        if marksheets.get('marksheet_10th'):
            ms = marksheets['marksheet_10th']
            print(f"  - 10th ({ms['board']}): {ms['student_name']} - {len(ms.get('subjects', []))} subjects")
        if marksheets.get('marksheet_12th'):
            ms = marksheets['marksheet_12th']
            print(f"  - 12th ({ms['board']}): {ms['student_name']} - {len(ms.get('subjects', []))} subjects")
        if marksheets.get('college_marksheets'):
            for ms in marksheets['college_marksheets']:
                print(f"  - Semester {ms['semester']}: {ms['student_name']} - {len(ms.get('subjects', []))} subjects - SGPA: {ms['sgpa']}")
    else:
        print("No marksheets found")
    
    print("\nDatabase test completed!")

if __name__ == "__main__":
    test_database()