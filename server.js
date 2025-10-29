// backend/server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

app.use(express.json());

// Connect to MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('DB Connection Failed:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// POST: Add Feedback
app.post('/api/feedback', (req, res) => {
  const { studentName, courseCode, comments, rating } = req.body;

  if (!studentName || !courseCode || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be 1–5' });
  }

  const sql = `INSERT INTO Feedback (studentName, courseCode, comments, rating) 
               VALUES (?, ?, ?, ?)`;
  db.query(sql, [studentName, courseCode, comments, rating], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.status(201).json({ id: result.insertId, ...req.body });
  });
});

// GET: All Feedback
app.get('/api/feedback', (req, res) => {
  const sql = `SELECT * FROM Feedback ORDER BY id DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// DELETE: Bonus
app.delete('/api/feedback/:id', (req, res) => {
  const sql = `DELETE FROM Feedback WHERE id = ?`;
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});