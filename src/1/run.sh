#!/bin/bash
# run_schedule.sh
# This script sets up a Python virtual environment, installs required dependencies,
# runs the scheduling program (which prints the final schedule), and then deactivates the environment.

ENV_DIR="venv"

# Create virtual environment if it does not exist
if [ ! -d "$ENV_DIR" ]; then
    echo "Creating Python virtual environment..."
    python -m venv "$ENV_DIR"
fi

# Activate the virtual environment
echo "Activating Python virtual environment..."
source "$ENV_DIR/bin/activate"

# Upgrade pip and install required dependencies
echo "Installing required dependencies..."
pip install tabulate

# Run the Python scheduling program that prints out the final schedule
echo "Running Python scheduling program..."
python schedule.py

# Deactivate the virtual environment
echo "Deactivating Python virtual environment..."
deactivate

# Run the JavaScript scheduling program that prints out the final schedule
echo "Running JavaScript [Node] scheduling program..."
node schedule.js




