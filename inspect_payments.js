const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function run() {
    try {
        const SQL = await initSqlJs();
        // Adjust path based on your user name or check the logs for "Database path:"
        // Assuming default path:
        const dbPath = path.join('C:', 'Users', 'HP', 'AppData', 'Roaming', 'POS by Cirvex', 'pos-database.sqlite');
        
        console.log('Reading DB from:', dbPath);
        if (!fs.existsSync(dbPath)) {
            console.error('Database file not found at:', dbPath);
            return;
        }

        const filebuffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(filebuffer);

        console.log('\n--- Payments Samples ---');
        const res = db.exec("SELECT method, count(*) as c FROM payments GROUP BY method");
        if (res.length > 0) {
            console.table(res[0].values);
        } else {
            console.log('No payments found.');
        }
        
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
