#!/bin/bash
# run_all_bonus.sh
# This script sets up a Python virtual environment, installs required dependencies,
# runs the Python bonus scheduling program, deactivates the environment, and then runs the JavaScript bonus program.

ENV_DIR="venv"

# Create virtual environment if it doesn't exist
if [ ! -d "$ENV_DIR" ]; then
    echo "Creating Python virtual environment..."
    python -m venv "$ENV_DIR"
fi

# Activate the Python virtual environment
echo "Activating Python virtual environment..."
source "$ENV_DIR/bin/activate"

# Upgrade pip and install required dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install tabulate

# Run the Python bonus scheduling program
echo "Running Python bonus scheduling program..."
python schedule.py

# Deactivate the Python virtual environment
echo "Deactivating Python virtual environment..."
deactivate

echo ""
# Run the JavaScript bonus scheduling program using Node.js
echo "Running JavaScript bonus scheduling program..."
node schedule.js
