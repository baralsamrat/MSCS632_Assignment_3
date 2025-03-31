const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csvParser = require('csv-parser');
const path = require('path');
const PDFDocument = require('pdfkit');

const app = express();
const port = 3000;

// Serve static files from public folder
app.use(express.static('public'));
app.use(express.json({ limit: '5mb' })); // to support JSON payload

// Configure multer for file uploads (temporary folder "uploads")
const upload = multer({ dest: 'uploads/' });

// Global definitions for days and shifts
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHIFTS = ["morning", "afternoon", "evening"];

// Inactivity timer (shuts down server after 5 minutes of no activity)
let inactivityTimer;
function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    console.log("No activity detected for 5 minutes. Shutting down server.");
    process.exit(0);
  }, 5 * 60 * 1000);
}
app.use((req, res, next) => {
  resetInactivityTimer();
  next();
});

// Global variable to store the latest schedule for PDF download
let latestSchedule = null;

/**
 * Helper: Parse CSV string (simple parser assuming no embedded commas)
 * Returns an array of objects (using the header row as keys)
 */
function parseCSVString(csvData) {
  const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
  if (!lines.length) return [];
  const headers = lines[0].split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, j) => {
      row[header.trim()] = values[j] ? values[j].trim() : "";
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Generate schedule using bonus logic (prioritized preferences)
 * Expects an array of employee objects (each with a "name" property and preference columns like "Monday_1", "Monday_2", etc.)
 */
function generateScheduleFromCSVRows(rows) {
  // Build employee data: { employeeName: { preferences: { day: [shift1, shift2, ...] }, days_worked: 0 } }
  const employees = {};
  rows.forEach(row => {
    const name = row['name'];
    const preferences = {};
    DAYS.forEach(day => {
      const prefList = [];
      ['_1', '_2', '_3'].forEach(rank => {
        const key = day + rank;
        if (row[key]) {
          const value = row[key].toLowerCase();
          if (value.includes("morning")) prefList.push("morning");
          else if (value.includes("afternoon")) prefList.push("afternoon");
          else if (value.includes("evening")) prefList.push("evening");
        }
      });
      preferences[day] = prefList;
    });
    employees[name] = { preferences: preferences, days_worked: 0 };
  });

  // Initialize schedule: for each day, each shift gets an empty array
  const schedule = {};
  DAYS.forEach(day => {
    schedule[day] = {};
    SHIFTS.forEach(shift => {
      schedule[day][shift] = [];
    });
  });

  // Process each day:
  DAYS.forEach(day => {
    const unassigned = [];
    // First pass: assign based on ranked preferences
    Object.keys(employees).forEach(emp => {
      let assigned = false;
      (employees[emp].preferences[day] || []).forEach(pref => {
        if (!assigned && schedule[day][pref].length < 2) {
          schedule[day][pref].push(emp);
          employees[emp].days_worked++;
          assigned = true;
        }
      });
      if (!assigned) unassigned.push(emp);
    });
    // Second pass: assign unassigned to any available shift on same day
    unassigned.forEach(emp => {
      let assigned = false;
      SHIFTS.forEach(shift => {
        if (!assigned && schedule[day][shift].length < 2) {
          schedule[day][shift].push(emp);
          employees[emp].days_worked++;
          assigned = true;
        }
      });
      // If still not assigned, try next day if possible
      if (!assigned) {
        const dayIndex = DAYS.indexOf(day);
        if (dayIndex < DAYS.length - 1) {
          const nextDay = DAYS[dayIndex + 1];
          SHIFTS.forEach(shift => {
            if (schedule[nextDay][shift].length < 2 && !assigned) {
              schedule[nextDay][shift].push(emp);
              employees[emp].days_worked++;
              assigned = true;
            }
          });
        }
      }
    });
    // Finally, fill any remaining vacancies randomly on this day
    SHIFTS.forEach(shift => {
      while (schedule[day][shift].length < 2) {
        // Get all employees assigned on this day
        let assignedToday = [];
        SHIFTS.forEach(s => {
          assignedToday = assignedToday.concat(schedule[day][s]);
        });
        const available = Object.keys(employees).filter(emp => !assignedToday.includes(emp));
        if (available.length > 0) {
          const chosen = available[Math.floor(Math.random() * available.length)];
          schedule[day][shift].push(chosen);
          employees[chosen].days_worked++;
        } else {
          break;
        }
      }
    });
  });
  return schedule;
}

/**
 * Convert schedule object into HTML table string.
 */
function scheduleToHTML(schedule) {
  let html = '<h2>Final Weekly Schedule</h2>';
  html += '<table border="1" cellspacing="0" cellpadding="5">';
  html += '<tr><th>Day</th><th>Morning</th><th>Afternoon</th><th>Evening</th></tr>';
  DAYS.forEach(day => {
    html += `<tr><td>${day}</td>`;
    SHIFTS.forEach(shift => {
      html += `<td>${schedule[day][shift].join(", ")}</td>`;
    });
    html += '</tr>';
  });
  html += '</table>';
  html += '<br><a href="/download-pdf">Download Schedule as PDF</a>';
  return html;
}

// Existing file-upload route (for backwards compatibility)
app.post('/upload', upload.single('csvfile'), (req, res) => {
  try {
    const filePath = req.file.path;
    const employees = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => employees.push(row))
      .on('end', () => {
        const schedule = generateScheduleFromCSVRows(employees);
        latestSchedule = schedule;
        const htmlTable = scheduleToHTML(schedule);
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
      });
  } catch (err) {
    res.status(500).send("Error processing file: " + err);
  }
});

// New route: Generate schedule from CSV data sent in JSON.
app.post('/generate', (req, res) => {
  try {
    const csvData = req.body.csvData;
    if (!csvData) {
      return res.status(400).send("No CSV data provided.");
    }
    const rows = parseCSVString(csvData);
    const schedule = generateScheduleFromCSVRows(rows);
    latestSchedule = schedule;
    const htmlTable = scheduleToHTML(schedule);
    res.send({ html: htmlTable });
  } catch (err) {
    res.status(500).send("Error generating schedule: " + err);
  }
});

// Route: Download PDF from the latest schedule.
app.get('/download-pdf', (req, res) => {
  if (!latestSchedule) {
    return res.status(404).send("No schedule available. Please generate one first.");
  }
  const doc = new PDFDocument();
  res.setHeader('Content-disposition', 'attachment; filename=schedule.pdf');
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);
  
  doc.fontSize(20).text("Final Weekly Schedule", { align: 'center' });
  doc.moveDown();
  DAYS.forEach(day => {
    doc.fontSize(14).text(day, { underline: true });
    SHIFTS.forEach(shift => {
      const shiftName = shift.charAt(0).toUpperCase() + shift.slice(1);
      doc.fontSize(12).text(`${shiftName}: ${latestSchedule[day][shift].join(", ")}`);
    });
    doc.moveDown();
  });
  doc.end();
});

// Start the server.
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  resetInactivityTimer();
});
