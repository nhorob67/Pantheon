#!/bin/bash
# Initialize the scale tickets SQLite database

DB_PATH="${FARMCLAW_DB_PATH:-/home/node/data/farmclaw.db}"

sqlite3 "$DB_PATH" <<'SQL'
CREATE TABLE IF NOT EXISTS scale_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  elevator TEXT,
  crop TEXT NOT NULL,
  gross_weight REAL,
  tare_weight REAL,
  net_weight REAL NOT NULL,
  moisture_pct REAL,
  test_weight REAL,
  dockage_pct REAL,
  price_per_bushel REAL,
  grade TEXT,
  truck_number TEXT,
  load_number TEXT,
  field_name TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  raw_ocr_text TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
SQL

echo "Scale tickets database initialized at $DB_PATH"
