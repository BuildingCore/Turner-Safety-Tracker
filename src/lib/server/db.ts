import Database from 'better-sqlite3';
import { dev } from '$app/environment';

const db = new Database(dev ? 'dev.db' : 'prod.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Drop old tables and create normalized schema
db.exec(`
  DROP TABLE IF EXISTS safety_records;
  DROP TABLE IF EXISTS subcontractors;
  DROP TABLE IF EXISTS annual_data;
  DROP TABLE IF EXISTS rmp_history;
  DROP TABLE IF EXISTS rmp_documents;
  DROP TABLE IF EXISTS rmp_comments;
  DROP TABLE IF EXISTS safety_rmps;
  
  CREATE TABLE subcontractors (
    id TEXT PRIMARY KEY,
    trade_pkg TEXT NOT NULL,
    trade_name TEXT NOT NULL,
    fein TEXT NOT NULL,
    current_emr TEXT NOT NULL,
    emr_expiration TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE annual_data (
    id TEXT PRIMARY KEY,
    subcontractor_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    recordables INTEGER NOT NULL,
    manhours INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id) ON DELETE CASCADE,
    UNIQUE(subcontractor_id, year)
  );

  -- Safety RMP submissions table (removed reviewer_notes)
  CREATE TABLE safety_rmps (
    id TEXT PRIMARY KEY,
    subcontractor_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    submitted_date TEXT NOT NULL,
    due_date TEXT,
    completed_date TEXT,
    status TEXT NOT NULL CHECK(status IN ('Pending', 'Rejected', 'Approved', 'Canceled')) DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id) ON DELETE CASCADE
  );

  -- RMP Documents table
  CREATE TABLE rmp_documents (
    id TEXT PRIMARY KEY,
    rmp_id TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by TEXT,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rmp_id) REFERENCES safety_rmps(id) ON DELETE CASCADE
  );

  -- RMP Comments table
  CREATE TABLE rmp_comments (
    id TEXT PRIMARY KEY,
    rmp_id TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rmp_id) REFERENCES safety_rmps(id) ON DELETE CASCADE
  );

  -- RMP History/Audit Log table
  CREATE TABLE rmp_history (
    id TEXT PRIMARY KEY,
    rmp_id TEXT NOT NULL,
    status_from TEXT,
    status_to TEXT NOT NULL,
    changed_by TEXT,
    notes TEXT,
    changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rmp_id) REFERENCES safety_rmps(id) ON DELETE CASCADE
  );

  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_safety_rmps_status ON safety_rmps(status);
  CREATE INDEX IF NOT EXISTS idx_safety_rmps_subcontractor ON safety_rmps(subcontractor_id);
  CREATE INDEX IF NOT EXISTS idx_rmp_documents_rmp ON rmp_documents(rmp_id);
  CREATE INDEX IF NOT EXISTS idx_rmp_comments_rmp ON rmp_comments(rmp_id);
`);

export { db };