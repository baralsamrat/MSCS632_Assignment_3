#!/bin/bash
# run_all_gui.sh
# This script sets up a Python virtual environment, installs required dependencies,
# runs the Python GUI scheduling program, then runs the Node.js web-based GUI.
# (On Windows, ensure Python is installed and in your PATH, and adjust paths as needed.)

ENV_DIR="venv"

# --- Python Part ---
if [ ! -d "$ENV_DIR" ]; then
    echo "Creating Python virtual environment..."
    python -m venv "$ENV_DIR"
fi

# Activate virtual environment (check for Windows or Unix path)
if [ -f "$ENV_DIR/Scripts/activate" ]; then
    echo "Activating Python virtual environment (Windows)..."
    source "$ENV_DIR/Scripts/activate"
elif [ -f "$ENV_DIR/bin/activate" ]; then
    echo "Activating Python virtual environment (Unix)..."
    source "$ENV_DIR/bin/activate"
else
    echo "Virtual environment activation script not found!"
    exit 1
fi

echo "Installing Python dependencies..."
pip install tabulate fpdf

echo "Running Python GUI scheduling program..."
python schedule.py

echo "Deactivating Python virtual environment..."
deactivate

echo "Node Checking"
npm cache clean --force
npm config set registry https://registry.npmjs.org/
rm -rf node_modules

# --- Node.js Part ---
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

echo "Starting the Employee Scheduling web app (Node.js)..."
node app.js
