const { app } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

app.on('ready', () => {
    try {
        const dbPath = path.join(app.getPath('userData'), 'pos.db');
        console.log('DB Path:', dbPath);
        const db = new Database(dbPath);

        console.log('--- Sales Table Schema ---');
        const columns = db.prepare('PRAGMA table_info(sales)').all();
        console.log(columns.map(c => c.name).join(', '));

        console.log('\n--- Latest Credit Sale ---');
        const creditSale = db.prepare(`
            SELECT cs.*, s.subtotal as sale_subtotal, s.tax_amount as sale_tax, s.total as sale_total 
            FROM credit_sales cs 
            LEFT JOIN sales s ON cs.sale_id = s.id 
            ORDER BY cs.created_at DESC 
            LIMIT 1
        `).get();
        console.log(JSON.stringify(creditSale, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
});
