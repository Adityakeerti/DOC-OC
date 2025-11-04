#!/usr/bin/env python3
"""
Database setup script - Run this to create the database and tables
"""
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

load_dotenv()

def setup_database():
    """Create database and tables"""
    try:
        # Connect without specifying database first
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'aditya')
        )
        
        cursor = connection.cursor()
        
        # Read and execute schema
        with open('schema.sql', 'r') as f:
            schema_sql = f.read()
        
        # Create database first
        cursor.execute("CREATE DATABASE IF NOT EXISTS DOC_OC")
        cursor.execute("USE DOC_OC")
        
        # Drop existing tables first (in correct order due to foreign keys)
        cursor.execute("DROP TABLE IF EXISTS college_subjects")
        cursor.execute("DROP TABLE IF EXISTS school_subjects")
        cursor.execute("DROP TABLE IF EXISTS marksheets")
        cursor.execute("DROP TABLE IF EXISTS college_marksheets")
        cursor.execute("DROP TABLE IF EXISTS marksheet_12th")
        cursor.execute("DROP TABLE IF EXISTS marksheet_10th")
        cursor.execute("DROP TABLE IF EXISTS users")
        
        # Execute each statement separately
        statements = schema_sql.split(';')
        for statement in statements:
            statement = statement.strip()
            if statement:
                cursor.execute(statement)
        
        connection.commit()
        print("Database and tables created successfully!")
        
    except Error as e:
        print(f"Error setting up database: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    setup_database()