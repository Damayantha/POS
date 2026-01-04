const { app } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join('d:/Projects/POSbyCirvex', 'electron/database/pos.db');
const db = new Database(dbPath);

console.log('--- Table Columns: inventory_logs ---');
const columns = db.prepare('PRAGMA table_info(inventory_logs)').all();
console.log(columns.map(c => c.name).join(', '));

console.log('\n--- Sync Status: Loop ID 40e60c39-1a95-4608-b54a-516421c039cd ---');
const row = db.prepare('SELECT id, type, is_synced FROM inventory_logs WHERE id = ?').get('40e60c39-1a95-4608-b54a-516421c039cd');
console.log(row);

console.log('\n--- Payments Samples (Method) ---');
const payments = db.prepare('SELECT id, method, amount FROM payments LIMIT 10').all();
console.table(payments);

console.log('\n--- Sales Table Sync Status ---');
const salesSync = db.prepare('SELECT id, is_synced FROM sales WHERE is_synced = 0 LIMIT 5').all();
console.log(salesSync);
