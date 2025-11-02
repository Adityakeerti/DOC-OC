@echo off
REM Backend startup script for Windows
REM This will start the FastAPI server on 0.0.0.0:8000 for network access

cd /d "%~dp0"
python run.py

