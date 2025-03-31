import csv
import random
from tabulate import tabulate

# Define days and shifts
days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
shifts = ["morning", "afternoon", "evening"]

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

# Read employee data from CSV file with bonus columns
employees = {}
with open('employee_shifts_bonus.csv', 'r', newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        name = row['name']
        # For each day, create a list of ranked preferences (first, second, third)
        preferences = {}
        for day in days:
            pref_list = []
            for rank in ['_1', '_2', '_3']:
                key = day + rank
                if key in row:
                    shift = extract_shift(row[key])
                    if shift:
                        pref_list.append(shift)
            preferences[day] = pref_list
        employees[name] = {"preferences": preferences, "days_worked": 0}

# Initialize the schedule: for each day, each shift starts empty
schedule = {day: {shift: [] for shift in shifts} for day in days}

# Process scheduling for each day
for day in days:
    unassigned = []  # Employees who cannot get any of their ranked preferences
    
    # First pass: try to assign based on ranked preferences (in order)
    for emp, details in employees.items():
        assigned = False
        for pref in details["preferences"][day]:
            if len(schedule[day][pref]) < 2:
                schedule[day][pref].append(emp)
                employees[emp]["days_worked"] += 1
                assigned = True
                break
        if not assigned:
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
        # If still not assigned, try to assign on the next day if available
        if not assigned:
            next_day_index = days.index(day) + 1
            if next_day_index < len(days):
                next_day = days[next_day_index]
                for shift in shifts:
                    if len(schedule[next_day][shift]) < 2:
                        schedule[next_day][shift].append(emp)
                        employees[emp]["days_worked"] += 1
                        break
    
    # Finally, fill any remaining vacancies on the day by randomly selecting eligible employees
    for shift in shifts:
        while len(schedule[day][shift]) < 2:
            # Find employees not already scheduled on this day
            available = [emp for emp in employees if emp not in sum(schedule[day].values(), [])]
            if available:
                chosen = random.choice(available)
                schedule[day][shift].append(chosen)
                employees[chosen]["days_worked"] += 1
            else:
                break

# Build table data for final schedule
table_data = []
for day in days:
    row = [day]
    for shift in shifts:
        row.append(", ".join(schedule[day][shift]))
    table_data.append(row)

headers = ["Day", "Morning", "Afternoon", "Evening"]
print(tabulate(table_data, headers=headers, tablefmt="grid"))
