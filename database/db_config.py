import os
from typing import Optional
import mysql.connector
from mysql.connector import Error

class DatabaseConfig:
    def __init__(self):
        self.host = os.getenv('DB_HOST', 'localhost')
        self.port = os.getenv('DB_PORT', 3306)
        self.database = os.getenv('DB_NAME', 'DOC_OC')
        self.user = os.getenv('DB_USER', 'root')
        self.password = os.getenv('DB_PASSWORD', 'aditya')

    def get_connection(self):
        try:
            connection = mysql.connector.connect(
                host=self.host,
                port=self.port,
                database=self.database,
                user=self.user,
                password=self.password
            )
            return connection
        except Error as e:
            print(f"Database connection error: {e}")
            return None

class MarksheetDB:
    def __init__(self):
        self.config = DatabaseConfig()

    def create_user(self, username: str, email: str) -> Optional[int]:
        connection = self.config.get_connection()
        if not connection:
            return None
        
        try:
            cursor = connection.cursor()
            query = "INSERT INTO users (username, email) VALUES (%s, %s)"
            cursor.execute(query, (username, email))
            connection.commit()
            user_id = cursor.lastrowid
            return user_id
        except Error as e:
            print(f"Error creating user: {e}")
            return None
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

    def get_user_by_email(self, email: str) -> Optional[dict]:
        connection = self.config.get_connection()
        if not connection:
            return None
        
        try:
            cursor = connection.cursor(dictionary=True)
            query = "SELECT * FROM users WHERE email = %s"
            cursor.execute(query, (email,))
            user = cursor.fetchone()
            return user
        except Error as e:
            print(f"Error getting user: {e}")
            return None
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

    def save_10th_marksheet(self, user_id: int, data: dict) -> Optional[int]:
        connection = self.config.get_connection()
        if not connection:
            return None
        
        try:
            cursor = connection.cursor()
            subjects = data.get('subjects', [])
            
            # Prepare subject data (up to 6 subjects)
            subject_data = {}
            for i in range(6):
                if i < len(subjects):
                    subject = subjects[i]
                    subject_data[f'subject{i+1}_code'] = subject.get('code')
                    subject_data[f'subject{i+1}_name'] = subject.get('name')
                    subject_data[f'subject{i+1}_theory_marks'] = subject.get('theory_marks')
                    subject_data[f'subject{i+1}_practical_marks'] = subject.get('practical_marks')
                    subject_data[f'subject{i+1}_internal_marks'] = subject.get('internal_marks')
                    subject_data[f'subject{i+1}_total_marks'] = subject.get('total_marks')
                    subject_data[f'subject{i+1}_marks'] = subject.get('marks')
                    subject_data[f'subject{i+1}_grade'] = subject.get('grade')
                    subject_data[f'subject{i+1}_percentage'] = subject.get('percentage')
                else:
                    subject_data[f'subject{i+1}_code'] = None
                    subject_data[f'subject{i+1}_name'] = None
                    subject_data[f'subject{i+1}_theory_marks'] = None
                    subject_data[f'subject{i+1}_practical_marks'] = None
                    subject_data[f'subject{i+1}_internal_marks'] = None
                    subject_data[f'subject{i+1}_total_marks'] = None
                    subject_data[f'subject{i+1}_marks'] = None
                    subject_data[f'subject{i+1}_grade'] = None
                    subject_data[f'subject{i+1}_percentage'] = None
            
            query = """
                INSERT INTO marksheet_10th 
                (user_id, board, student_name, roll_number, unique_id, school_name, school_code, 
                 mother_name, father_name, subject1_code, subject1_name, subject1_theory_marks, 
                 subject1_practical_marks, subject1_internal_marks, subject1_total_marks, 
                 subject1_marks, subject1_grade, subject1_percentage, subject2_code, subject2_name, 
                 subject2_theory_marks, subject2_practical_marks, subject2_internal_marks, 
                 subject2_total_marks, subject2_marks, subject2_grade, subject2_percentage, 
                 subject3_code, subject3_name, subject3_theory_marks, subject3_practical_marks, 
                 subject3_internal_marks, subject3_total_marks, subject3_marks, subject3_grade, 
                 subject3_percentage, subject4_code, subject4_name, subject4_theory_marks, 
                 subject4_practical_marks, subject4_internal_marks, subject4_total_marks, 
                 subject4_marks, subject4_grade, subject4_percentage, subject5_code, subject5_name, 
                 subject5_theory_marks, subject5_practical_marks, subject5_internal_marks, 
                 subject5_total_marks, subject5_marks, subject5_grade, subject5_percentage, 
                 subject6_code, subject6_name, subject6_theory_marks, subject6_practical_marks, 
                 subject6_internal_marks, subject6_total_marks, subject6_marks, subject6_grade, 
                 subject6_percentage) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                board = VALUES(board), student_name = VALUES(student_name), uploaded_at = CURRENT_TIMESTAMP
            """
            
            cursor.execute(query, (
                user_id, data.get('board', ''), data.get('student_name'), data.get('roll_number'),
                data.get('unique_id'), data.get('school_name'), data.get('school_code'),
                data.get('mother_name'), data.get('father_name'),
                *[subject_data[f'subject{i+1}_{field}'] for i in range(6) 
                  for field in ['code', 'name', 'theory_marks', 'practical_marks', 'internal_marks', 
                               'total_marks', 'marks', 'grade', 'percentage']]
            ))
            
            connection.commit()
            return cursor.lastrowid or 1
        except Error as e:
            print(f"Error saving 10th marksheet: {e}")
            return None
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

    def save_12th_marksheet(self, user_id: int, data: dict) -> Optional[int]:
        connection = self.config.get_connection()
        if not connection:
            return None
        
        try:
            cursor = connection.cursor()
            subjects = data.get('subjects', [])
            
            # Prepare subject data (up to 6 subjects)
            subject_data = {}
            for i in range(6):
                if i < len(subjects):
                    subject = subjects[i]
                    subject_data[f'subject{i+1}_code'] = subject.get('code')
                    subject_data[f'subject{i+1}_name'] = subject.get('name')
                    subject_data[f'subject{i+1}_theory_marks'] = subject.get('theory_marks')
                    subject_data[f'subject{i+1}_practical_marks'] = subject.get('practical_marks')
                    subject_data[f'subject{i+1}_internal_marks'] = subject.get('internal_marks')
                    subject_data[f'subject{i+1}_total_marks'] = subject.get('total_marks')
                    subject_data[f'subject{i+1}_marks'] = subject.get('marks')
                    subject_data[f'subject{i+1}_grade'] = subject.get('grade')
                    subject_data[f'subject{i+1}_percentage'] = subject.get('percentage')
                else:
                    subject_data[f'subject{i+1}_code'] = None
                    subject_data[f'subject{i+1}_name'] = None
                    subject_data[f'subject{i+1}_theory_marks'] = None
                    subject_data[f'subject{i+1}_practical_marks'] = None
                    subject_data[f'subject{i+1}_internal_marks'] = None
                    subject_data[f'subject{i+1}_total_marks'] = None
                    subject_data[f'subject{i+1}_marks'] = None
                    subject_data[f'subject{i+1}_grade'] = None
                    subject_data[f'subject{i+1}_percentage'] = None
            
            query = """
                INSERT INTO marksheet_12th 
                (user_id, board, student_name, roll_number, unique_id, school_name, school_code, 
                 mother_name, father_name, subject1_code, subject1_name, subject1_theory_marks, 
                 subject1_practical_marks, subject1_internal_marks, subject1_total_marks, 
                 subject1_marks, subject1_grade, subject1_percentage, subject2_code, subject2_name, 
                 subject2_theory_marks, subject2_practical_marks, subject2_internal_marks, 
                 subject2_total_marks, subject2_marks, subject2_grade, subject2_percentage, 
                 subject3_code, subject3_name, subject3_theory_marks, subject3_practical_marks, 
                 subject3_internal_marks, subject3_total_marks, subject3_marks, subject3_grade, 
                 subject3_percentage, subject4_code, subject4_name, subject4_theory_marks, 
                 subject4_practical_marks, subject4_internal_marks, subject4_total_marks, 
                 subject4_marks, subject4_grade, subject4_percentage, subject5_code, subject5_name, 
                 subject5_theory_marks, subject5_practical_marks, subject5_internal_marks, 
                 subject5_total_marks, subject5_marks, subject5_grade, subject5_percentage, 
                 subject6_code, subject6_name, subject6_theory_marks, subject6_practical_marks, 
                 subject6_internal_marks, subject6_total_marks, subject6_marks, subject6_grade, 
                 subject6_percentage) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                board = VALUES(board), student_name = VALUES(student_name), uploaded_at = CURRENT_TIMESTAMP
            """
            
            cursor.execute(query, (
                user_id, data.get('board', ''), data.get('student_name'), data.get('roll_number'),
                data.get('unique_id'), data.get('school_name'), data.get('school_code'),
                data.get('mother_name'), data.get('father_name'),
                *[subject_data[f'subject{i+1}_{field}'] for i in range(6) 
                  for field in ['code', 'name', 'theory_marks', 'practical_marks', 'internal_marks', 
                               'total_marks', 'marks', 'grade', 'percentage']]
            ))
            
            connection.commit()
            return cursor.lastrowid or 1
        except Error as e:
            print(f"Error saving 12th marksheet: {e}")
            return None
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

    def save_college_marksheet(self, user_id: int, semester: int, data: dict) -> Optional[int]:
        connection = self.config.get_connection()
        if not connection:
            return None
        
        try:
            cursor = connection.cursor()
            college_data = data.get('college', {})
            student_data = data.get('student', {})
            result_data = data.get('result', {})
            subjects = data.get('subjects', [])
            
            # Prepare subject data (up to 10 subjects)
            subject_data = {}
            for i in range(10):
                if i < len(subjects):
                    subject = subjects[i]
                    subject_data[f'subject{i+1}_code'] = subject.get('code')
                    subject_data[f'subject{i+1}_name'] = subject.get('name')
                    subject_data[f'subject{i+1}_credits'] = subject.get('credits')
                    subject_data[f'subject{i+1}_internal_marks'] = subject.get('internal_marks')
                    subject_data[f'subject{i+1}_external_marks'] = subject.get('external_marks')
                    subject_data[f'subject{i+1}_total_marks'] = subject.get('total')
                    subject_data[f'subject{i+1}_grade'] = subject.get('grade')
                    subject_data[f'subject{i+1}_grade_point'] = subject.get('grade_point')
                else:
                    subject_data[f'subject{i+1}_code'] = None
                    subject_data[f'subject{i+1}_name'] = None
                    subject_data[f'subject{i+1}_credits'] = None
                    subject_data[f'subject{i+1}_internal_marks'] = None
                    subject_data[f'subject{i+1}_external_marks'] = None
                    subject_data[f'subject{i+1}_total_marks'] = None
                    subject_data[f'subject{i+1}_grade'] = None
                    subject_data[f'subject{i+1}_grade_point'] = None
            
            # Build dynamic query
            subject_fields = []
            subject_values = []
            for i in range(10):
                for field in ['code', 'name', 'credits', 'internal_marks', 'external_marks', 'total_marks', 'grade', 'grade_point']:
                    subject_fields.append(f'subject{i+1}_{field}')
                    subject_values.append(subject_data[f'subject{i+1}_{field}'])
            
            query = f"""
                INSERT INTO college_marksheets 
                (user_id, semester, course, session, student_name, roll_no, enrollment_no, 
                 father_name, sgpa, cgpa, total_credits_registered, total_credits_earned, status,
                 {', '.join(subject_fields)}) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, {', '.join(['%s'] * len(subject_values))})
                ON DUPLICATE KEY UPDATE
                course = VALUES(course), student_name = VALUES(student_name), uploaded_at = CURRENT_TIMESTAMP
            """
            
            cursor.execute(query, (
                user_id, semester, college_data.get('course'), college_data.get('session'),
                student_data.get('name'), student_data.get('roll_no'), student_data.get('enrollment_no'),
                student_data.get('father_name'), result_data.get('sgpa'), result_data.get('cgpa'),
                result_data.get('total_credits_registered'), result_data.get('total_credits_earned'),
                result_data.get('status'), *subject_values
            ))
            
            connection.commit()
            return cursor.lastrowid or 1
        except Error as e:
            print(f"Error saving college marksheet: {e}")
            return None
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

    def get_user_marksheets(self, user_id: int) -> dict:
        connection = self.config.get_connection()
        if not connection:
            return {}
        
        try:
            cursor = connection.cursor(dictionary=True)
            
            # Get 10th marksheet
            cursor.execute("SELECT * FROM marksheet_10th WHERE user_id = %s", (user_id,))
            marksheet_10th = cursor.fetchone()
            
            # Get 12th marksheet
            cursor.execute("SELECT * FROM marksheet_12th WHERE user_id = %s", (user_id,))
            marksheet_12th = cursor.fetchone()
            
            # Get college marksheets
            cursor.execute("SELECT * FROM college_marksheets WHERE user_id = %s ORDER BY semester", (user_id,))
            college_marksheets = cursor.fetchall()
            
            return {
                'marksheet_10th': marksheet_10th,
                'marksheet_12th': marksheet_12th,
                'college_marksheets': college_marksheets
            }
        except Error as e:
            print(f"Error getting marksheets: {e}")
            return {}
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()