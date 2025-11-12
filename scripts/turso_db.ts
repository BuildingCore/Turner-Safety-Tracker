import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
});

async function setupDatabase() {
  console.log('Setting up Turso database...');

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        job_title TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS subcontractors (
        id TEXT PRIMARY KEY,
        trade_pkg TEXT NOT NULL,
        trade_name TEXT NOT NULL,
        fein TEXT,
        current_emr TEXT,
        emr_expiration TEXT
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS annual_data (
        id TEXT PRIMARY KEY,
        subcontractor_id TEXT NOT NULL,
        year INTEGER NOT NULL,
        recordables INTEGER DEFAULT 0,
        manhours INTEGER DEFAULT 0,
        FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS safety_rmps (
        id TEXT PRIMARY KEY,
        subcontractor_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        project_number TEXT NOT NULL,
        status TEXT DEFAULT 'Pending Review',
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS rmp_comments (
        id TEXT PRIMARY KEY,
        rmp_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        comment TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rmp_id) REFERENCES safety_rmps(id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS rmp_history (
        id TEXT PRIMARY KEY,
        rmp_id TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rmp_id) REFERENCES safety_rmps(id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS rmp_documents (
        id TEXT PRIMARY KEY,
        rmp_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rmp_id) REFERENCES safety_rmps(id)
      )
    `);

    console.log('✅ Database setup complete!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();