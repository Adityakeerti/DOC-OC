-- Database schema for marksheet storage
CREATE DATABASE IF NOT EXISTS DOC_OC;
USE DOC_OC;

-- Users table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    current_semester INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10th marksheet table with subjects as JSON
CREATE TABLE marksheet_10th (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    board VARCHAR(50) NOT NULL,
    student_name VARCHAR(100),
    roll_number VARCHAR(50),
    unique_id VARCHAR(50),
    school_name VARCHAR(200),
    school_code VARCHAR(20),
    mother_name VARCHAR(100),
    father_name VARCHAR(100),
    
    -- Subject 1
    subject1_code VARCHAR(20),
    subject1_name VARCHAR(100),
    subject1_theory_marks INT,
    subject1_practical_marks INT,
    subject1_internal_marks INT,
    subject1_total_marks INT,
    subject1_marks INT,
    subject1_grade VARCHAR(10),
    subject1_percentage DECIMAL(5,2),
    
    -- Subject 2
    subject2_code VARCHAR(20),
    subject2_name VARCHAR(100),
    subject2_theory_marks INT,
    subject2_practical_marks INT,
    subject2_internal_marks INT,
    subject2_total_marks INT,
    subject2_marks INT,
    subject2_grade VARCHAR(10),
    subject2_percentage DECIMAL(5,2),
    
    -- Subject 3
    subject3_code VARCHAR(20),
    subject3_name VARCHAR(100),
    subject3_theory_marks INT,
    subject3_practical_marks INT,
    subject3_internal_marks INT,
    subject3_total_marks INT,
    subject3_marks INT,
    subject3_grade VARCHAR(10),
    subject3_percentage DECIMAL(5,2),
    
    -- Subject 4
    subject4_code VARCHAR(20),
    subject4_name VARCHAR(100),
    subject4_theory_marks INT,
    subject4_practical_marks INT,
    subject4_internal_marks INT,
    subject4_total_marks INT,
    subject4_marks INT,
    subject4_grade VARCHAR(10),
    subject4_percentage DECIMAL(5,2),
    
    -- Subject 5
    subject5_code VARCHAR(20),
    subject5_name VARCHAR(100),
    subject5_theory_marks INT,
    subject5_practical_marks INT,
    subject5_internal_marks INT,
    subject5_total_marks INT,
    subject5_marks INT,
    subject5_grade VARCHAR(10),
    subject5_percentage DECIMAL(5,2),
    
    -- Subject 6
    subject6_code VARCHAR(20),
    subject6_name VARCHAR(100),
    subject6_theory_marks INT,
    subject6_practical_marks INT,
    subject6_internal_marks INT,
    subject6_total_marks INT,
    subject6_marks INT,
    subject6_grade VARCHAR(10),
    subject6_percentage DECIMAL(5,2),
    
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 12th marksheet table with subjects
CREATE TABLE marksheet_12th (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    board VARCHAR(50) NOT NULL,
    student_name VARCHAR(100),
    roll_number VARCHAR(50),
    unique_id VARCHAR(50),
    school_name VARCHAR(200),
    school_code VARCHAR(20),
    mother_name VARCHAR(100),
    father_name VARCHAR(100),
    
    -- Subject 1
    subject1_code VARCHAR(20),
    subject1_name VARCHAR(100),
    subject1_theory_marks INT,
    subject1_practical_marks INT,
    subject1_internal_marks INT,
    subject1_total_marks INT,
    subject1_marks INT,
    subject1_grade VARCHAR(10),
    subject1_percentage DECIMAL(5,2),
    
    -- Subject 2
    subject2_code VARCHAR(20),
    subject2_name VARCHAR(100),
    subject2_theory_marks INT,
    subject2_practical_marks INT,
    subject2_internal_marks INT,
    subject2_total_marks INT,
    subject2_marks INT,
    subject2_grade VARCHAR(10),
    subject2_percentage DECIMAL(5,2),
    
    -- Subject 3
    subject3_code VARCHAR(20),
    subject3_name VARCHAR(100),
    subject3_theory_marks INT,
    subject3_practical_marks INT,
    subject3_internal_marks INT,
    subject3_total_marks INT,
    subject3_marks INT,
    subject3_grade VARCHAR(10),
    subject3_percentage DECIMAL(5,2),
    
    -- Subject 4
    subject4_code VARCHAR(20),
    subject4_name VARCHAR(100),
    subject4_theory_marks INT,
    subject4_practical_marks INT,
    subject4_internal_marks INT,
    subject4_total_marks INT,
    subject4_marks INT,
    subject4_grade VARCHAR(10),
    subject4_percentage DECIMAL(5,2),
    
    -- Subject 5
    subject5_code VARCHAR(20),
    subject5_name VARCHAR(100),
    subject5_theory_marks INT,
    subject5_practical_marks INT,
    subject5_internal_marks INT,
    subject5_total_marks INT,
    subject5_marks INT,
    subject5_grade VARCHAR(10),
    subject5_percentage DECIMAL(5,2),
    
    -- Subject 6
    subject6_code VARCHAR(20),
    subject6_name VARCHAR(100),
    subject6_theory_marks INT,
    subject6_practical_marks INT,
    subject6_internal_marks INT,
    subject6_total_marks INT,
    subject6_marks INT,
    subject6_grade VARCHAR(10),
    subject6_percentage DECIMAL(5,2),
    
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- College marksheets table with subjects
CREATE TABLE college_marksheets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    semester INT NOT NULL,
    course VARCHAR(200),
    session VARCHAR(20),
    student_name VARCHAR(100),
    roll_no VARCHAR(50),
    enrollment_no VARCHAR(50),
    father_name VARCHAR(100),
    sgpa DECIMAL(4,2),
    cgpa DECIMAL(4,2),
    total_credits_registered INT,
    total_credits_earned INT,
    status VARCHAR(20),
    
    -- Subject 1
    subject1_code VARCHAR(20),
    subject1_name VARCHAR(200),
    subject1_credits INT,
    subject1_internal_marks INT,
    subject1_external_marks INT,
    subject1_total_marks INT,
    subject1_grade VARCHAR(10),
    subject1_grade_point DECIMAL(3,2),
    
    -- Subject 2
    subject2_code VARCHAR(20),
    subject2_name VARCHAR(200),
    subject2_credits INT,
    subject2_internal_marks INT,
    subject2_external_marks INT,
    subject2_total_marks INT,
    subject2_grade VARCHAR(10),
    subject2_grade_point DECIMAL(3,2),
    
    -- Subject 3
    subject3_code VARCHAR(20),
    subject3_name VARCHAR(200),
    subject3_credits INT,
    subject3_internal_marks INT,
    subject3_external_marks INT,
    subject3_total_marks INT,
    subject3_grade VARCHAR(10),
    subject3_grade_point DECIMAL(3,2),
    
    -- Subject 4
    subject4_code VARCHAR(20),
    subject4_name VARCHAR(200),
    subject4_credits INT,
    subject4_internal_marks INT,
    subject4_external_marks INT,
    subject4_total_marks INT,
    subject4_grade VARCHAR(10),
    subject4_grade_point DECIMAL(3,2),
    
    -- Subject 5
    subject5_code VARCHAR(20),
    subject5_name VARCHAR(200),
    subject5_credits INT,
    subject5_internal_marks INT,
    subject5_external_marks INT,
    subject5_total_marks INT,
    subject5_grade VARCHAR(10),
    subject5_grade_point DECIMAL(3,2),
    
    -- Subject 6
    subject6_code VARCHAR(20),
    subject6_name VARCHAR(200),
    subject6_credits INT,
    subject6_internal_marks INT,
    subject6_external_marks INT,
    subject6_total_marks INT,
    subject6_grade VARCHAR(10),
    subject6_grade_point DECIMAL(3,2),
    
    -- Subject 7
    subject7_code VARCHAR(20),
    subject7_name VARCHAR(200),
    subject7_credits INT,
    subject7_internal_marks INT,
    subject7_external_marks INT,
    subject7_total_marks INT,
    subject7_grade VARCHAR(10),
    subject7_grade_point DECIMAL(3,2),
    
    -- Subject 8
    subject8_code VARCHAR(20),
    subject8_name VARCHAR(200),
    subject8_credits INT,
    subject8_internal_marks INT,
    subject8_external_marks INT,
    subject8_total_marks INT,
    subject8_grade VARCHAR(10),
    subject8_grade_point DECIMAL(3,2),
    
    -- Subject 9
    subject9_code VARCHAR(20),
    subject9_name VARCHAR(200),
    subject9_credits INT,
    subject9_internal_marks INT,
    subject9_external_marks INT,
    subject9_total_marks INT,
    subject9_grade VARCHAR(10),
    subject9_grade_point DECIMAL(3,2),
    
    -- Subject 10
    subject10_code VARCHAR(20),
    subject10_name VARCHAR(200),
    subject10_credits INT,
    subject10_internal_marks INT,
    subject10_external_marks INT,
    subject10_total_marks INT,
    subject10_grade VARCHAR(10),
    subject10_grade_point DECIMAL(3,2),
    
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_semester (user_id, semester)
);