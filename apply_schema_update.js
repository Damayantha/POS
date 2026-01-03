const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const userDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
const dbPath = path.join(userDataPath, 'pos-by-cirvex', 'pos-database.sqlite');

console.log('Opening database at:', dbPath);
const db = new Database(dbPath);

try {
    // 1. Create Tables
    console.log('Creating supplier_payments table...');
    db.prepare(`
        CREATE TABLE IF NOT EXISTS supplier_payments (
            id TEXT PRIMARY KEY,
            purchase_order_id TEXT REFERENCES purchase_orders(id) ON DELETE CASCADE,
            supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
            amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            reference TEXT,
            notes TEXT,
            paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT REFERENCES employees(id)
        )
    `).run();

    console.log('Creating purchase_returns table...');
    db.prepare(`
        CREATE TABLE IF NOT EXISTS purchase_returns (
            id TEXT PRIMARY KEY,
            return_number TEXT UNIQUE NOT NULL,
            purchase_order_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL,
            supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'draft',
            total_amount REAL NOT NULL,
            notes TEXT,
            created_by TEXT REFERENCES employees(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    console.log('Creating purchase_return_items table...');
    db.prepare(`
        CREATE TABLE IF NOT EXISTS purchase_return_items (
            id TEXT PRIMARY KEY,
            return_id TEXT REFERENCES purchase_returns(id) ON DELETE CASCADE,
            product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_cost REAL NOT NULL,
            reason TEXT
        )
    `).run();

    // 2. Add Columns to purchase_orders
    console.log('Checking purchase_orders columns...');
    const poColumns = db.prepare("PRAGMA table_info(purchase_orders)").all();
    const hasAmountPaid = poColumns.some(c => c.name === 'amount_paid');
    const hasPaymentStatus = poColumns.some(c => c.name === 'payment_status');

    if (!hasAmountPaid) {
        console.log('Adding amount_paid to purchase_orders...');
        db.prepare("ALTER TABLE purchase_orders ADD COLUMN amount_paid REAL DEFAULT 0").run();
    }
    if (!hasPaymentStatus) {
        console.log('Adding payment_status to purchase_orders...');
        db.prepare("ALTER TABLE purchase_orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'").run();
    }

    // 3. Add Columns to suppliers
    console.log('Checking suppliers columns...');
    const supplierColumns = db.prepare("PRAGMA table_info(suppliers)").all();
    const hasBalance = supplierColumns.some(c => c.name === 'balance');

    if (!hasBalance) {
        console.log('Adding balance to suppliers...');
        db.prepare("ALTER TABLE suppliers ADD COLUMN balance REAL DEFAULT 0").run();
    }

    console.log('Schema update completed successfully!');

} catch (error) {
    console.error('Migration failed:', error);
} finally {
    db.close();
}
