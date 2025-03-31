# Employee Scheduling Application Assignment
a small application for managing employee schedules at a company. The company operates 7 days a week and allows employees to choose shifts in the morning, afternoon, or evening. 


## Overview

This assignment required the development of an employee scheduling application that assigns employees to shifts (morning, afternoon, or evening) based on their preferences. The application enforces core requirements:
- **No employee works more than one shift per day.**
- **Each employee may work a maximum of 5 days per week** (this rule can be adjusted as needed).
- **Each shift must have exactly 2 employees.**
- **Handling Conflicts:** When more than two employees prefer the same shift, only two are assigned their choice, and the others are reassigned to available shifts.

Additionally, the **bonus requirement** was to:
- **Allow employees to indicate shift preferences with a priority ranking** (e.g., first preference: morning; second preference: evening).
- **Implement logic** to accommodate these preferences as much as possible while ensuring that company shift requirements are met.
- Optionally, **implement a Graphical User Interface (GUI)** for both input (employee names and shift preferences) and output (final employee schedule).

## Implementation Details

The assignment was implemented in **two distinct programming languages** to showcase different paradigms:

### Python Implementation

- **Language & Tools:** Python, Tkinter for the GUI, FPDF for PDF generation, and Tabulate for table formatting.
- **Functionality:**
  - **CSV Input & Editing:**  
    The application reads employee data from a CSV file. The CSV includes columns for the employee name and for each day three columns for ranked shift preferences (e.g., `Monday_1`, `Monday_2`, `Monday_3`).
  - **Scheduling Logic:**  
    Using control structures (loops, conditionals, branching), the program attempts to assign each employee to their highest available preference. If none are available, it reassigns the employee to any open shift on that day (or the next day if necessary). This bonus logic ensures that company shift requirements are met.
  - **GUI Components:**  
    - A **main window** to load a CSV file.
    - A **CSV Editor window** that allows in-GUI editing of employee data.
    - A **schedule display** using a Treeview table.
    - Functionality to **save the generated schedule as a PDF**.
- **How to Run (Python):**
  1. Install dependencies:
     ```sh
     pip install fpdf tabulate
     ```
  2. Run the application:
     ```sh
     python schedule_gui.py
     ```
  3. Use the GUI to load/edit the CSV, generate the schedule, and save the schedule as a PDF.

### JavaScript (Node.js) Implementation

- **Language & Tools:** JavaScript, Node.js, Express for the web server, Multer for file uploads, csv-parser for CSV reading, and PDFKit for PDF generation.
- **Functionality:**
  - **CSV Input:**  
    The application accepts a CSV file (with ranked shift preferences) via an HTML file-upload form.
  - **Scheduling Logic:**  
    Implements similar bonus logic as the Python version—attempting to honor employees' ranked preferences while ensuring that each shift is filled with exactly 2 employees.
  - **Web-Based GUI:**  
    - An **HTML interface** served by Express allows users to upload CSV files.
    - The final schedule is displayed as an HTML table.
    - A **PDF download option** is provided to save the schedule as a PDF.
  - **Inactivity Timer:**  
    The server automatically shuts down after 5 minutes of inactivity.
- **How to Run (JavaScript):**
  1. Ensure Node.js is installed.
  2. Create or update a **package.json** (see section below) and install dependencies:
     ```sh
     npm install
     ```
  3. Start the application:
     ```sh
     node app.js
     ```
  4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to use the web interface.

#### package.json

```json
{
  "name": "employee-scheduling-gui",
  "version": "1.0.0",
  "description": "A web-based GUI for employee scheduling with ranked shift preferences and PDF output",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "csv-parser": "^3.0.0",
    "pdfkit": "^0.13.0"
  },
  "author": "Samrat Baral",
  "license": "MIT"
}
```

## Combined Execution via Shell Script

A shell script (`run_all_gui.sh`) is provided to run both the Python and JavaScript implementations sequentially. On Windows, ensure that the virtual environment activation script path is correct (using `venv\Scripts\activate`).

```sh
# hon GUI scheduling program, then runs the Node.js web-based GUI.

ENV_DIR="venv"

# --- Python Part ---
if [ ! -d "$ENV_DIR" ]; then
    echo "Creating Python virtual environment..."
    python -m venv "$ENV_DIR"
fi

# Activate virtual environment (Windows or Unix)
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
pip install --upgrade pip
pip install tabulate fpdf

echo "Running Python GUI scheduling program..."
python schedule_gui.py

echo "Deactivating Python virtual environment..."
deactivate

echo ""
# --- Node.js Part ---
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

echo "Starting the Employee Scheduling web app (Node.js)..."
node app.js
```

## Deliverables

- **Source Code Files:**
  - `schedule_gui.py` – Python GUI application with CSV editing, scheduling logic, and PDF output.
  - `app.js` – Node.js web server with CSV upload, scheduling logic, HTML schedule display, and PDF download.
  - `run_all_gui.sh` – Shell script to run both implementations.
  - `package.json` – Node.js dependency file.
- **CSV Files:**  
  Example CSV files (e.g., `employee_shifts_bonus.csv`) containing employee names and ranked shift preferences.
- **Documentation & Screenshots:**  
  This markdown file serves as documentation. Additional screenshots of the application’s GUI and PDF outputs are included in the submission document.

## Challenges and Lessons Learned

- **Implementing Complex Logic:**  
  Handling the assignment logic with multiple ranked preferences required careful use of control structures (loops, conditionals, and branching) in both Python and JavaScript.
- **GUI Development:**  
  Building a GUI for CSV editing and schedule display in Python (using Tkinter) and a web-based interface in JavaScript (using Express) enhanced our understanding of cross-platform user interfaces.
- **Cross-Language Consistency:**  
  Implementing the same functionality in two different programming languages underscored the importance of clear and maintainable code structure.

## Conclusion

This assignment demonstrates the ability to implement a complex scheduling system using multiple programming languages. The bonus functionality—prioritized shift preferences, GUI-based CSV editing, and PDF output—was successfully integrated into both Python and JavaScript implementations. This project highlights proficiency in control structures, GUI development, and cross-platform integration.

---