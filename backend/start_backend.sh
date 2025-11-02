#!/bin/bash
# Backend startup script for Linux/Mac
# This will start the FastAPI server on 0.0.0.0:8000 for network access

cd "$(dirname "$0")"
python3 run.py

