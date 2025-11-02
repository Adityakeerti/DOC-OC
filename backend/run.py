#!/usr/bin/env python3
"""
Backend server startup script
Runs FastAPI backend on all network interfaces (0.0.0.0) for mobile/remote access
"""
import uvicorn
from pathlib import Path

if __name__ == "__main__":
    # Get the backend directory
    backend_dir = Path(__file__).resolve().parent
    main_file = backend_dir / "main.py"
    
    # Run on 0.0.0.0 to accept connections from any IP address
    # This allows access from phones and other devices on the same network
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Bind to all interfaces, not just localhost
        port=8000,
        reload=True,  # Auto-reload on code changes
        app_dir=str(backend_dir)  # Set app directory so imports work correctly
    )

