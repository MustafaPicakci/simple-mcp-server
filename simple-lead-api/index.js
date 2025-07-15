import dotenv from "dotenv";
import express from "express";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

pool.query(`
  CREATE TABLE IF NOT EXISTS lead (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20)
  )
`);

app.post("/api/lead", async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const result = await pool.query("INSERT INTO lead (name, email, phone) VALUES ($1, $2, $3) RETURNING *", [name, email, phone]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/lead", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM lead");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log(" Server running at http://localhost:3000");
});
