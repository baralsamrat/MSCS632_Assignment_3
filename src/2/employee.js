const fs = require('fs');

// Define days and shifts
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const shifts = ["morning", "afternoon", "evening"];

/**
 * Extract the primary shift keyword from a human-friendly string.
 * E.g., "Morning (8:00 AM - 12:00 PM)" returns "morning".
 */
function extractShift(cellValue) {
  const value = cellValue.trim().toLowerCase();
  if (value.includes("morning")) return "morning";
  if (value.includes("afternoon")) return "afternoon";
  if (value.includes("evening")) return "evening";
  return "";
}

// Read CSV file synchronously from 'employee_shifts_bonus.csv'
const csvData = fs.readFileSync('employee_shifts_bonus.csv', 'utf8');
const lines = csvData.split('\n').filter(line => line.trim() !== '');
const header = lines[0].split(',');

// Build employee data with ranked preferences
let employees = {};
for (let i = 1; i < lines.length; i++) {
  let row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
  if (!row || row.length < header.length) continue;
  const name = row[0].replace(/"/g, '');
  let preferences = {};
  for (let day of days) {
    let prefList = [];
    for (let rank of ['_1', '_2', '_3']) {
      let key = day + rank;
      let idx = header.indexOf(key);
      if (idx !== -1 && row[idx]) {
        let shift = extractShift(row[idx].replace(/"/g, ''));
        if (shift) prefList.push(shift);
      }
    }
    preferences[day] = prefList;
  }
  employees[name] = { preferences: preferences, days_worked: 0 };
}

// Initialize schedule: each day has each shift as an empty array
let schedule = {};
days.forEach(day => {
  schedule[day] = {};
  shifts.forEach(shift => {
    schedule[day][shift] = [];
  });
});

// Helper: Get all employees assigned on a given day
function getAssignedForDay(day) {
  return shifts.reduce((acc, shift) => acc.concat(schedule[day][shift]), []);
}

// Process scheduling for each day using ranked preferences
days.forEach((day, dayIndex) => {
  let unassigned = [];
  
  // First pass: assign employees based on their ranked preferences
  Object.keys(employees).forEach(emp => {
    let assigned = false;
    let prefList = employees[emp].preferences[day] || [];
    for (let pref of prefList) {
      if (schedule[day][pref].length < 2) {
        schedule[day][pref].push(emp);
        employees[emp].days_worked++;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
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
    // If still not assigned, try the next day (if available)
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
  
  // Finally, fill any remaining vacancies on the day by randomly selecting available employees
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

// Build table data: each row represents a day with its shifts
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
