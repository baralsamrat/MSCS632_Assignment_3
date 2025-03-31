const fs = require('fs');

// Define days and shifts
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const shifts = ["morning", "afternoon", "evening"];

/**
 * Extract the primary shift keyword from a human‑friendly string.
 * For example, "Morning (8:00 AM - 12:00 PM)" returns "morning".
 */
function extractShift(cellValue) {
  const value = cellValue.trim().toLowerCase();
  if (value.includes("morning")) {
    return "morning";
  } else if (value.includes("afternoon")) {
    return "afternoon";
  } else if (value.includes("evening")) {
    return "evening";
  } else {
    // If nothing matches, return an empty string
    return "";
  }
}

// Read CSV file synchronously (expects employee_shifts.csv in the same directory)
const csvData = fs.readFileSync('employee_shifts.csv', 'utf8');
const lines = csvData.split('\n').filter(line => line.trim() !== '');
const header = lines[0].split(',');

// Build employee data from CSV
let employees = {};
for (let i = 1; i < lines.length; i++) {
  // Use a regex to handle commas inside quotes
  let row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
  if (!row || row.length < header.length) continue;
  const name = row[0].replace(/"/g, '');
  let preferences = {};
  for (let j = 1; j < header.length; j++) {
    let day = header[j].trim();
    let cellValue = row[j] ? row[j].replace(/"/g, '') : "";
    let extracted = extractShift(cellValue);
    // If the extracted value is empty, default to "morning"
    preferences[day] = extracted || "morning";
  }
  employees[name] = { preferences: preferences, days_worked: 0 };
}

// Initialize schedule: For each day, each shift starts as an empty array
let schedule = {};
days.forEach(day => {
  schedule[day] = {};
  shifts.forEach(shift => {
    schedule[day][shift] = [];
  });
});

// Helper: Get a list of all employees already assigned on a given day
function getAssignedForDay(day) {
  return shifts.reduce((acc, shift) => acc.concat(schedule[day][shift]), []);
}

// Process scheduling for each day
days.forEach((day, dayIndex) => {
  let unassigned = [];
  
  // First pass: assign employees to their preferred shift (if not full)
  Object.keys(employees).forEach(emp => {
    // Use default "morning" if the preference is invalid
    let preferred = employees[emp].preferences[day] || "morning";
    if (!schedule[day][preferred]) {
      // If the preferred shift isn't valid, default to "morning"
      preferred = "morning";
    }
    if (schedule[day][preferred].length < 2) {
      schedule[day][preferred].push(emp);
      employees[emp].days_worked++;
    } else {
      unassigned.push(emp);
    }
  });
  
  // Second pass: assign unassigned employees to any available shift on the same day
  unassigned.forEach(emp => {
    let assigned = false;
    for (let shift of shifts) {
      if (schedule[day][shift].length < 2) {
        schedule[day][shift].push(emp);
        employees[emp].days_worked++;
        assigned = true;
        break;
      }
    }
    // If still not assigned, attempt to assign on the next day (if available)
    if (!assigned && dayIndex < days.length - 1) {
      let nextDay = days[dayIndex + 1];
      for (let shift of shifts) {
        if (schedule[nextDay][shift].length < 2) {
          schedule[nextDay][shift].push(emp);
          employees[emp].days_worked++;
          break;
        }
      }
    }
  });
  
  // Finally, fill any remaining vacancies on the day by randomly selecting eligible employees
  shifts.forEach(shift => {
    while (schedule[day][shift].length < 2) {
      let assignedToday = getAssignedForDay(day);
      let available = Object.keys(employees).filter(emp => !assignedToday.includes(emp));
      if (available.length > 0) {
        let chosen = available[Math.floor(Math.random() * available.length)];
        schedule[day][shift].push(chosen);
        employees[chosen].days_worked++;
      } else {
        break;
      }
    }
  });
});

// Build table data: each row represents a day and the employees assigned to each shift.
let tableData = days.map(day => {
  return {
    "Day": day,
    "Morning": schedule[day]["morning"].join(", "),
    "Afternoon": schedule[day]["afternoon"].join(", "),
    "Evening": schedule[day]["evening"].join(", ")
  };
});

// Output the final schedule as a table using console.table
console.log("Final Weekly Schedule:");
console.table(tableData);
