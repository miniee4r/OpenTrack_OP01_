"""
Forwarding module to root main.py app instance.
Allows both `uvicorn main:app` and `uvicorn backend.main:app` to work seamlessly.
"""
import sys
import os

# Add root folder to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
