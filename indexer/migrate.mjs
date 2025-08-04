#!/usr/bin/env node
/**
 * 📦 Database Migration Script
 * Runs migrations using Node.js (no psql required)
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES modules dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

async function runMigration() {
  console.log('🗄️  CryptoGift Indexer - Database Migration');
  console.log('==========================================');
  
  // Use owner URL for migrations
  const databaseUrl = process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL_OWNER or DATABASE_URL not configured');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📜 Running migration script...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully');
    
    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    
    console.log('🎉 Database migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();