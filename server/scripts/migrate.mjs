import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../data/domains.db');
const migrationPath = join(__dirname, '../db/migrations/0001_add_watchkind_priority_actions.sql');

console.log('Applying migration...');
console.log('Database:', dbPath);
console.log('Migration:', migrationPath);

try {
  const db = new Database(dbPath);
  const migration = readFileSync(migrationPath, 'utf-8');

  // Split by semicolon and execute each statement
  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  db.exec('BEGIN TRANSACTION');

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 50) + '...');
    db.exec(statement);
  }

  db.exec('COMMIT');
  db.close();

  console.log('✅ Migration applied successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
