// backend/server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

/* ---------- CORS (allow local dev + Vercel live) ---------- */
const allowedOrigins = [
  'http://localhost:5174',                     // Vite dev server
  process.env.FRONTEND_URL || 'http://localhost:5174' // Vercel URL (set in Render env)
];
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'DELETE'],
    credentials: false
  })
);

app.use(express.json());

/* ---------- MySQL connection (env vars from Render) ---------- */
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306   // freesqldatabase.com uses 3306
});

db.connect(err => {
  if (err) {
    console.error('DB Connection Failed:', err);
    process.exit(1);   // stop the server if DB is unreachable
  }
  console.log('Connected to MySQL');
});

/* ---------- POST /api/feedback ---------- */
app.post('/api/feedback', (req, res) => {
  const { studentName, courseCode, comments, rating } = req.body;

  // ---- validation ----
  if (!studentName?.trim() || !courseCode?.trim() || rating == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer 1‑5' });
  }

  const sql = `
    INSERT INTO Feedback (studentName, courseCode, comments, rating)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [studentName.trim(), courseCode.trim(), comments?.trim() || null, rating], (err, result) => {
    if (err) {
      console.error('INSERT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ id: result.insertId, studentName, courseCode, comments, rating });
  });
});

/* ---------- GET /api/feedback ---------- */
app.get('/api/feedback', (req, res) => {
  const sql = `SELECT * FROM Feedback ORDER BY id DESC`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('SELECT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

/* ---------- DELETE /api/feedback/:id (BONUS) ---------- */
app.delete('/api/feedback/:id', (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  const sql = `DELETE FROM Feedback WHERE id = ?`;
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('DELETE error:', err);
      return res.status(500).json({ error: 'Delete failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json({ message: 'Deleted' });
  });
});

/* ---------- Start server ---------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});