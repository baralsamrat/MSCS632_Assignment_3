const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files (for our HTML form)
app.use(express.static('public'));

// Configure multer for file uploads (files stored temporarily in 'uploads' folder)
const upload = multer({ dest: 'uploads/' });

// Global definitions for days and shifts
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHIFTS = ["morning", "afternoon", "evening"];

/**
 * Extract the primary shift keyword from a human‑friendly string.
 * E.g., "Morning (8:00 AM - 12:00 PM)" returns "morning".
 */
function extractShift(cellValue) {
  const value = cellValue.trim().toLowerCase();
  if (value.includes("morning")) return "morning";
  if (value.includes("afternoon")) return "afternoon";
  if (value.includes("evening")) return "evening";
  return "";
}

/**
 * Parse the CSV file and build an employee data object.
 * Expected CSV columns include ranked preferences for each day,
 * e.g., Monday_1, Monday_2, Monday_3, etc.
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const employees = {};
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const name = row['name'];
        const preferences = {};
        for (const day of DAYS) {
          const prefList = [];
          // Expecting columns: day_1, day_2, day_3
          for (const rank of ['_1', '_2', '_3']) {
            const key = day + rank;
            if (row[key]) {
              const shift = extractShift(row[key]);
              if (shift) prefList.push(shift);
            }
          }
          preferences[day] = prefList;
        }
        employees[name] = { preferences: preferences, days_worked: 0 };
      })
      .on('end', () => resolve(employees))
      .on('error', (err) => reject(err));
  });
}

/**
 * Generate the schedule using bonus logic with ranked preferences.
 */
function generateSchedule(employees) {
  // Initialize the schedule: for each day, each shift is an empty array.
  const schedule = {};
  for (const day of DAYS) {
    schedule[day] = {};
    for (const shift of SHIFTS) {
      schedule[day][shift] = [];
    }
  }

  // Process each day
  for (const day of DAYS) {
    const unassigned = [];
    // First pass: try to assign employees based on their ranked preferences
    for (const emp in employees) {
      let assigned = false;
      for (const pref of employees[emp].preferences[day] || []) {
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
    }

    // Second pass: assign unassigned employees to any available shift on the same day
    for (const emp of unassigned) {
      let assigned = false;
      for (const shift of SHIFTS) {
        if (schedule[day][shift].length < 2) {
          schedule[day][shift].push(emp);
          employees[emp].days_worked++;
          assigned = true;
          break;
        }
      }
      // If still not assigned, try the next day (if possible)
      if (!assigned) {
        const dayIndex = DAYS.indexOf(day);
        if (dayIndex < DAYS.length - 1) {
          const nextDay = DAYS[dayIndex + 1];
          for (const shift of SHIFTS) {
            if (schedule[nextDay][shift].length < 2) {
              schedule[nextDay][shift].push(emp);
              employees[emp].days_worked++;
              break;
            }
          }
        }
      }
    }

    // Finally, fill any remaining vacancies on the day by randomly selecting eligible employees.
    for (const shift of SHIFTS) {
      while (schedule[day][shift].length < 2) {
        // Find employees not already scheduled on this day.
        const assignedToday = [].concat(...SHIFTS.map(s => schedule[day][s]));
        const available = Object.keys(employees).filter(emp => !assignedToday.includes(emp));
        if (available.length > 0) {
          const chosen = available[Math.floor(Math.random() * available.length)];
          schedule[day][shift].push(chosen);
          employees[chosen].days_worked++;
        } else {
          break;
        }
      }
    }
  }
  return schedule;
}

/**
 * Convert the schedule object into an HTML table.
 */
function scheduleToHTML(schedule) {
  let html = '<h2>Final Weekly Schedule</h2>';
  html += '<table border="1" cellspacing="0" cellpadding="5">';
  html += '<tr><th>Day</th><th>Morning</th><th>Afternoon</th><th>Evening</th></tr>';
  for (const day of DAYS) {
    html += `<tr><td>${day}</td>`;
    for (const shift of SHIFTS) {
      html += `<td>${schedule[day][shift].join(", ")}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

// Route: Serve the main HTML page.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route: Handle CSV file upload, process scheduling, and display results.
app.post('/upload', upload.single('csvfile'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const employees = await parseCSV(filePath);
    const schedule = generateSchedule(employees);
    const htmlTable = scheduleToHTML(schedule);
    // Delete the uploaded file.
    fs.unlinkSync(filePath);
    res.send(`
      <html>
        <head><title>Final Schedule</title></head>
        <body>
          ${htmlTable}
          <br>
          <a href="/">Go Back</a>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Error processing file: " + err);
  }
});

// Start the server.
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
