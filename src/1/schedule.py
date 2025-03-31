#pip install tabular
import csv
import random
from tabulate import tabulate

# Define days and shifts
days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
shifts = ["morning", "afternoon", "evening"]

def extract_shift(cell_value):
    """
    Extract the primary shift keyword from a human-friendly cell value.
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
        return value  # fallback

# Read employee data from CSV file
employees = {}
with open('employee_shifts.csv', 'r', newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        name = row['name']
        # Build the preferences dictionary for each day
        preferences = {day: extract_shift(row[day]) for day in days}
        employees[name] = {"preferences": preferences, "days_worked": 0}

# Initialize the schedule: a dictionary where each day maps to a dictionary of shifts (each with an employee list)
schedule = {day: {shift: [] for shift in shifts} for day in days}

# Process each day: Assign shifts based on preferences and apply scheduling logic
for day in days:
    # First pass: assign employees to their preferred shift if available
    unassigned = []  # Employees who didn't get their preferred shift
    for emp, details in employees.items():
        # Remove the weekly limit check if everyone is meant to work all 7 days
        preferred = details["preferences"][day]
        if len(schedule[day][preferred]) < 2:
            schedule[day][preferred].append(emp)
            employees[emp]["days_worked"] += 1
        else:
            unassigned.append(emp)

    # Second pass: assign unassigned employees to any available shift on the same day
    for emp in unassigned:
        assigned = False
        for shift in shifts:
            if len(schedule[day][shift]) < 2:
                schedule[day][shift].append(emp)
                employees[emp]["days_worked"] += 1
                assigned = True
                break
        # If still not assigned, attempt to assign on the next day (if available)
        if not assigned:
            next_day_index = days.index(day) + 1
            if next_day_index < len(days):
                next_day = days[next_day_index]
                for shift in shifts:
                    if len(schedule[next_day][shift]) < 2:
                        schedule[next_day][shift].append(emp)
                        employees[emp]["days_worked"] += 1
                        break

    # Fill any remaining vacancies on the day by randomly selecting eligible employees
    for shift in shifts:
        while len(schedule[day][shift]) < 2:
            # Select employees not already scheduled on this day
            available = [
                emp for emp in employees 
                if emp not in sum(schedule[day].values(), [])  # flatten assigned names list
            ]
            if available:
                chosen = random.choice(available)
                schedule[day][shift].append(chosen)
                employees[chosen]["days_worked"] += 1
            else:
                break

# Create table data: each row represents a day and its shifts
table_data = []
for day in days:
    row = [day]
    for shift in shifts:
        # Combine employee names for each shift in the day
        row.append(", ".join(schedule[day][shift]))
    table_data.append(row)

# Define table headers
headers = ["Day", "Morning", "Afternoon", "Evening"]

# Output the final schedule as a table
print(tabulate(table_data, headers=headers, tablefmt="grid"))
