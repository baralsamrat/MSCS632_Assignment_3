import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import csv
import random
from fpdf import FPDF

# Global definitions for days and shifts
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
SHIFTS = ["morning", "afternoon", "evening"]

def extract_shift(cell_value):
    """Extract the primary shift keyword from a human-friendly string."""
    value = cell_value.strip().lower()
    if "morning" in value:
        return "morning"
    elif "afternoon" in value:
        return "afternoon"
    elif "evening" in value:
        return "evening"
    else:
        return ""

###############################################################################
# CSV Editor using Treeview with inline editing
###############################################################################
class CSVEditor:
    def __init__(self, master, csv_path):
        self.master = master
        self.csv_path = csv_path
        self.data = []
        self.headers = []
        self.load_csv()
        self.build_gui()
    
    def load_csv(self):
        try:
            with open(self.csv_path, 'r', newline='') as csvfile:
                reader = csv.reader(csvfile)
                self.data = list(reader)
            if self.data:
                self.headers = self.data[0]
            else:
                self.headers = []
        except Exception as e:
            messagebox.showerror("Error", f"Failed to read CSV file:\n{e}")
    
    def build_gui(self):
        self.top = tk.Toplevel(self.master)
        self.top.title("CSV Editor")
        self.top.geometry("900x500")
        
        # Create Treeview widget for CSV data
        self.tree = ttk.Treeview(self.top, columns=self.headers, show="headings")
        for header in self.headers:
            self.tree.heading(header, text=header)
            self.tree.column(header, width=150)
        
        # Insert CSV rows (skip header)
        for i, row in enumerate(self.data[1:]):
            self.tree.insert("", "end", iid=str(i), values=row)
        
        self.tree.pack(fill=tk.BOTH, expand=True)
        self.tree.bind("<Double-1>", self.on_double_click)
        
        # Save button
        self.save_btn = tk.Button(self.top, text="Save CSV", command=self.save_csv)
        self.save_btn.pack(pady=10)
    
    def on_double_click(self, event):
        # Identify clicked cell
        region = self.tree.identify("region", event.x, event.y)
        if region != "cell":
            return
        rowid = self.tree.identify_row(event.y)
        column = self.tree.identify_column(event.x)
        col_index = int(column.replace("#", "")) - 1
        
        # Get cell bbox and current value
        x, y, width, height = self.tree.bbox(rowid, column)
        value = self.tree.item(rowid, "values")[col_index]
        
        # Create Entry widget for editing
        self.entry = tk.Entry(self.tree)
        self.entry.place(x=x, y=y, width=width, height=height)
        self.entry.insert(0, value)
        self.entry.focus_set()
        self.entry.bind("<Return>", lambda e: self.on_return(rowid, col_index))
        self.entry.bind("<FocusOut>", lambda e: self.on_return(rowid, col_index))
    
    def on_return(self, rowid, col_index):
        new_value = self.entry.get()
        values = list(self.tree.item(rowid, "values"))
        values[col_index] = new_value
        self.tree.item(rowid, values=values)
        self.entry.destroy()
    
    def save_csv(self):
        # Gather data from Treeview
        new_data = [self.headers]
        for rowid in self.tree.get_children():
            new_data.append(self.tree.item(rowid, "values"))
        save_path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV Files", "*.csv")])
        if save_path:
            try:
                with open(save_path, 'w', newline='') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerows(new_data)
                messagebox.showinfo("CSV Saved", f"CSV file saved as:\n{save_path}")
                # Optionally update the CSV path to the new file
                self.csv_path = save_path
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save CSV:\n{e}")

###############################################################################
# Main Scheduling Application with GUI and PDF output
###############################################################################
class ScheduleApp:
    def __init__(self, master):
        self.master = master
        master.title("Employee Scheduling App")
        master.geometry("800x550")
        
        self.csv_path = None
        self.employees = {}  # Employee data from CSV
        self.schedule = {}   # Final schedule
        
        # Top frame with control buttons
        self.top_frame = tk.Frame(master)
        self.top_frame.pack(pady=10)
        
        self.load_btn = tk.Button(self.top_frame, text="Load CSV", command=self.load_csv)
        self.load_btn.pack(side=tk.LEFT, padx=5)
        
        self.edit_btn = tk.Button(self.top_frame, text="Edit CSV", command=self.edit_csv, state=tk.DISABLED)
        self.edit_btn.pack(side=tk.LEFT, padx=5)
        
        self.gen_btn = tk.Button(self.top_frame, text="Generate Schedule", command=self.generate_schedule, state=tk.DISABLED)
        self.gen_btn.pack(side=tk.LEFT, padx=5)
        
        self.pdf_btn = tk.Button(self.top_frame, text="Save Schedule as PDF", command=self.save_pdf, state=tk.DISABLED)
        self.pdf_btn.pack(side=tk.LEFT, padx=5)
        
        # Treeview to display final schedule
        self.tree = ttk.Treeview(master)
        self.tree["columns"] = ("Morning", "Afternoon", "Evening")
        self.tree.heading("#0", text="Day")
        self.tree.column("#0", width=100, anchor="center")
        for col in self.tree["columns"]:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=200, anchor="center")
        self.tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
    
    def load_csv(self):
        path = filedialog.askopenfilename(title="Select CSV File", filetypes=(("CSV Files", "*.csv"),))
        if path:
            self.csv_path = path
            messagebox.showinfo("File Loaded", f"Loaded file:\n{path}")
            self.gen_btn.config(state=tk.NORMAL)
            self.edit_btn.config(state=tk.NORMAL)
    
    def edit_csv(self):
        if not self.csv_path:
            messagebox.showerror("Error", "No CSV file loaded to edit.")
            return
        # Open the CSV Editor window
        CSVEditor(self.master, self.csv_path)
    
    def generate_schedule(self):
        if not self.csv_path:
            messagebox.showerror("Error", "No CSV file loaded.")
            return
        
        # Clear previous data and Treeview contents
        self.employees = {}
        self.schedule = {}
        self.tree.delete(*self.tree.get_children())
        
        try:
            with open(self.csv_path, 'r', newline='') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    name = row['name']
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
        
        # Initialize schedule for each day
        for day in DAYS:
            self.schedule[day] = {shift: [] for shift in SHIFTS}
        
        # Scheduling logic with ranked preferences
        for day in DAYS:
            unassigned = []
            # First pass: assign based on ranked preferences
            for emp, details in self.employees.items():
                assigned = False
                for pref in details["preferences"].get(day, []):
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
                if not assigned:
                    day_index = DAYS.index(day)
                    if day_index < len(DAYS) - 1:
                        next_day = DAYS[day_index + 1]
                        for shift in SHIFTS:
                            if len(self.schedule[next_day][shift]) < 2:
                                self.schedule[next_day][shift].append(emp)
                                self.employees[emp]["days_worked"] += 1
                                break
            
            # Finally, fill remaining vacancies randomly
            for shift in SHIFTS:
                while len(self.schedule[day][shift]) < 2:
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
        
        # Display final schedule in the Treeview
        for day in DAYS:
            morning = ", ".join(self.schedule[day]["morning"])
            afternoon = ", ".join(self.schedule[day]["afternoon"])
            evening = ", ".join(self.schedule[day]["evening"])
            self.tree.insert("", "end", text=day, values=(morning, afternoon, evening))
        
        self.pdf_btn.config(state=tk.NORMAL)
    
    def save_pdf(self):
        if not self.schedule:
            messagebox.showerror("Error", "No schedule available to save.")
            return
        
        pdf_path = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF Files", "*.pdf")])
        if not pdf_path:
            return
        
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(0, 10, "Final Weekly Schedule", ln=True, align='C')
        pdf.ln(10)
        
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(30, 10, "Day", border=1, align='C')
        pdf.cell(60, 10, "Morning", border=1, align='C')
        pdf.cell(60, 10, "Afternoon", border=1, align='C')
        pdf.cell(60, 10, "Evening", border=1, align='C')
        pdf.ln()
        
        pdf.set_font("Arial", '', 12)
        for day in DAYS:
            pdf.cell(30, 10, day, border=1)
            morning = ", ".join(self.schedule[day]["morning"])
            afternoon = ", ".join(self.schedule[day]["afternoon"])
            evening = ", ".join(self.schedule[day]["evening"])
            pdf.cell(60, 10, morning, border=1)
            pdf.cell(60, 10, afternoon, border=1)
            pdf.cell(60, 10, evening, border=1)
            pdf.ln()
        
        try:
            pdf.output(pdf_path)
            messagebox.showinfo("PDF Saved", f"Schedule saved as PDF:\n{pdf_path}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save PDF:\n{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = ScheduleApp(root)
    root.mainloop()
