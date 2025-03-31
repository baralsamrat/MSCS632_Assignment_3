import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import csv
import random

# Global definitions for days and shifts
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
SHIFTS = ["morning", "afternoon", "evening"]

def extract_shift(cell_value):
    """
    Extract the primary shift keyword from a human-friendly string.
    For example, "Morning (8:00 AM - 12:00 PM)" returns "morning".
    """
    value = cell_value.strip().lower()
    if "morning" in value:
        return "morning"
    elif "afternoon" in value:
        return "afternoon"
    elif "evening" in value:
        return "evening"
    else:
        return ""

class ScheduleApp:
    def __init__(self, master):
        self.master = master
        master.title("Employee Scheduling App")
        master.geometry("400x150")
        
        self.csv_path = None
        self.employees = {}  # will hold employee data from CSV
        self.schedule = {}   # final schedule data
        
        # Create and pack UI components
        self.label = tk.Label(master, text="Load your employee shift CSV (with ranked preferences)")
        self.label.pack(pady=5)
        
        self.load_button = tk.Button(master, text="Load CSV", command=self.load_csv)
        self.load_button.pack(pady=5)
        
        self.generate_button = tk.Button(master, text="Generate Schedule", command=self.generate_schedule, state=tk.DISABLED)
        self.generate_button.pack(pady=5)
    
    def load_csv(self):
        # Open file dialog to select CSV file
        path = filedialog.askopenfilename(title="Select CSV File", filetypes=(("CSV Files", "*.csv"),))
        if path:
            self.csv_path = path
            messagebox.showinfo("File Loaded", f"Loaded file:\n{path}")
            self.generate_button.config(state=tk.NORMAL)
    
    def generate_schedule(self):
        if not self.csv_path:
            messagebox.showerror("Error", "No CSV file loaded.")
            return
        
        # Read employee data from CSV file (expecting bonus columns, e.g., Monday_1, Monday_2, Monday_3, etc.)
        self.employees = {}
        try:
            with open(self.csv_path, 'r', newline='') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    name = row['name']
                    # For each day, create a list of ranked preferences (first, second, third)
                    preferences = {}
                    for day in DAYS:
                        pref_list = []
                        for rank in ['_1', '_2', '_3']:
                            key = day + rank
                            if key in row:
                                shift = extract_shift(row[key])
                                if shift:
                                    pref_list.append(shift)
                        preferences[day] = pref_list
                    self.employees[name] = {"preferences": preferences, "days_worked": 0}
        except Exception as e:
            messagebox.showerror("Error", f"Failed to read CSV file:\n{e}")
            return
        
        # Initialize the schedule dictionary for each day and shift
        self.schedule = {day: {shift: [] for shift in SHIFTS} for day in DAYS}
        
        # Process scheduling for each day
        for day in DAYS:
            unassigned = []  # Employees who could not get any of their ranked preferences
            
            # First pass: assign employees based on their ranked preferences (in order)
            for emp, details in self.employees.items():
                assigned = False
                for pref in details["preferences"][day]:
                    if len(self.schedule[day][pref]) < 2:
                        self.schedule[day][pref].append(emp)
                        self.employees[emp]["days_worked"] += 1
                        assigned = True
                        break
                if not assigned:
                    unassigned.append(emp)
            
            # Second pass: assign unassigned employees to any available shift on the same day
            for emp in unassigned:
                assigned = False
                for shift in SHIFTS:
                    if len(self.schedule[day][shift]) < 2:
                        self.schedule[day][shift].append(emp)
                        self.employees[emp]["days_worked"] += 1
                        assigned = True
                        break
                # If still not assigned, try assigning on the next day (if possible)
                if not assigned:
                    day_index = DAYS.index(day)
                    if day_index < len(DAYS) - 1:
                        next_day = DAYS[day_index + 1]
                        for shift in SHIFTS:
                            if len(self.schedule[next_day][shift]) < 2:
                                self.schedule[next_day][shift].append(emp)
                                self.employees[emp]["days_worked"] += 1
                                break
            
            # Finally, fill any remaining vacancies on the day by randomly selecting eligible employees
            for shift in SHIFTS:
                while len(self.schedule[day][shift]) < 2:
                    # Find employees not already scheduled on this day
                    assigned_today = []
                    for s in SHIFTS:
                        assigned_today.extend(self.schedule[day][s])
                    available = [emp for emp in self.employees if emp not in assigned_today]
                    if available:
                        chosen = random.choice(available)
                        self.schedule[day][shift].append(chosen)
                        self.employees[chosen]["days_worked"] += 1
                    else:
                        break
        
        # Once scheduling is complete, display the schedule
        self.display_schedule()
    
    def display_schedule(self):
        # Create a new window for displaying the final schedule table
        win = tk.Toplevel(self.master)
        win.title("Final Weekly Schedule")
        win.geometry("600x300")
        
        # Create a Treeview widget for the table
        tree = ttk.Treeview(win)
        tree["columns"] = ("Morning", "Afternoon", "Evening")
        tree.heading("#0", text="Day")
        tree.column("#0", width=100)
        for col in tree["columns"]:
            tree.heading(col, text=col)
            tree.column(col, width=150)
        
        # Insert schedule data into the Treeview
        for day in DAYS:
            morning = ", ".join(self.schedule[day]["morning"])
            afternoon = ", ".join(self.schedule[day]["afternoon"])
            evening = ", ".join(self.schedule[day]["evening"])
            tree.insert("", "end", text=day, values=(morning, afternoon, evening))
        
        tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Add a button to close the schedule window
        close_btn = tk.Button(win, text="Close", command=win.destroy)
        close_btn.pack(pady=5)

if __name__ == "__main__":
    root = tk.Tk()
    app = ScheduleApp(root)
    root.mainloop()
