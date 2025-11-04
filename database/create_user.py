#!/usr/bin/env python3
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

try:
    connection = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', 'aditya'),
        database=os.getenv('DB_NAME', 'DOC_OC')
    )
    
    cursor = connection.cursor()
    
    # Create user aditya
    query = "INSERT INTO users (username, email) VALUES (%s, %s)"
    cursor.execute(query, ('aditya', 'aditya@gmail.com'))
    connection.commit()
    
    user_id = cursor.lastrowid
    print(f"User 'aditya' created successfully with ID: {user_id}")
    print("Email: aditya@gmail.com")
    print("Password: 123")
    
except mysql.connector.Error as e:
    if e.errno == 1062:  # Duplicate entry
        print("User 'aditya' already exists")
        print("Email: aditya@gmail.com") 
        print("Password: 123")
    else:
        print(f"Error: {e}")
finally:
    if connection.is_connected():
        cursor.close()
        connection.close()