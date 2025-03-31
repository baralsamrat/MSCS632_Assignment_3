const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const PDFDocument = require('pdfkit');
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
 * Extract the primary shift keyword from a human-friendly string.
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
  const schedule = {};
  for (const day of DAYS) {
    schedule[day] = {};
    for (const shift of SHIFTS) {
      schedule[day][shift] = [];
    }
  }

  for (const day of DAYS) {
    const unassigned = [];
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
    for (const shift of SHIFTS) {
      while (schedule[day][shift].length < 2) {
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
  // Add a link to download PDF
  html += `<br><a href="/download-pdf">Download Schedule as PDF</a>`;
  return html;
}

// --- Inactivity Timer ---
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

// Global variable to store the latest generated schedule
let latestSchedule = null;

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
    latestSchedule = schedule; // store for PDF generation
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
  } catch (err) {
    res.status(500).send("Error processing file: " + err);
  }
});

// New Route: Download the schedule as a PDF.
app.get('/download-pdf', (req, res) => {
  if (!latestSchedule) {
    return res.status(404).send("No schedule available. Please upload a CSV file first.");
  }
  const doc = new PDFDocument();
  res.setHeader('Content-disposition', 'attachment; filename=schedule.pdf');
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(20).text("Final Weekly Schedule", { align: 'center' });
  doc.moveDown();

  for (const day of DAYS) {
    doc.fontSize(14).text(day, { underline: true });
    for (const shift of SHIFTS) {
      const shiftName = shift.charAt(0).toUpperCase() + shift.slice(1);
      doc.fontSize(12).text(`${shiftName}: ${latestSchedule[day][shift].join(", ")}`);
    }
    doc.moveDown();
  }
  doc.end();
});

// Start the server.
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  resetInactivityTimer();
});
