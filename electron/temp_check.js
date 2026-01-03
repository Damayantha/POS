console.log('=== MAIN.JS LOADED ===');
const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, runQuery, runInsert, getOne, saveDatabase } = require('./database/init');
const { v4: uuid } = require('uuid');
const { getImagesDir } = require('./services/imageService');
const ReceiptService = require('./services/receiptService');

const receiptService = new ReceiptService();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.ico')
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register scheme as privileged
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true } }
]);

// App lifecycle
app.whenReady().then(async () => {
  // Initialize database
  await initDatabase();

  // Register app protocol for serving images
  protocol.registerFileProtocol('app', (request, callback) => {
    let url = request.url.substr(6); // Remove 'app://'
    // Remove trailing slashes
    url = url.replace(/\/+$/, '');
    // Decode URL to handle spaces and special characters
    const decodedUrl = decodeURI(url);
    const imagesDir = getImagesDir();
    const filePath = path.join(imagesDir, decodedUrl);
    console.log('App protocol request:', request.url, '-> File:', filePath);
    callback({ path: filePath });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window controls IPC
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// Categories
ipcMain.handle('db:categories:getAll', () => {


  return runQuery('SELECT * FROM categories ORDER BY name');
});

// ==========================================
// BACKUP & RESTORE
// ==========================================
ipcMain.handle('backup:create', async () => {
  const dbPath = path.join(app.getPath('userData'), 'pos-database.sqlite');

  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Backup',
    defaultPath: `pos-backup-${new Date().toISOString().split('T')[0]}.sqlite`,
    filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
  });

  if (filePath) {
    try {
      fs.copyFileSync(dbPath, filePath);
      return { success: true, path: filePath };
    } catch (error) {
      console.error('Backup failed:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle('backup:restore', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Import Backup',
    filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
    properties: ['openFile']
  });

  if (filePaths && filePaths.length > 0) {
    const backupPath = filePaths[0];
    const dbPath = path.join(app.getPath('userData'), 'pos-database.sqlite');

    try {
      fs.copyFileSync(backupPath, dbPath);
      await initDatabase();
      return { success: true };
    } catch (error) {
      console.error('Restore failed:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle('backup:reset', async () => {
  const dbPath = path.join(app.getPath('userData'), 'pos-database.sqlite');
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    await initDatabase();
    return { success: true };
  } catch (error) {
    console.error('Reset failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:categories:create', (_, category) => {
  runInsert('INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
    [category.id, category.name, category.color, category.icon]);
  return category;
});

ipcMain.handle('db:categories:update', (_, category) => {
  runInsert('UPDATE categories SET name = ?, color = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [category.name, category.color, category.icon, category.id]);
  return category;
});

ipcMain.handle('db:categories:delete', (_, id) => {
  runInsert('DELETE FROM categories WHERE id = ?', [id]);
  return true;
});

// Products
ipcMain.handle('db:products:getAll', () => {
  return runQuery(`
    SELECT p.*, c.name as category_name, c.color as category_color 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    ORDER BY p.name
  `);
});

ipcMain.handle('db:products:getById', (_, id) => {
  return getOne(`
    SELECT p.*, c.name as category_name, c.color as category_color 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.id = ?
  `, [id]);
});

ipcMain.handle('db:products:search', (_, query) => {
  const searchTerm = `%${query}%`;
  return runQuery(`
    SELECT p.*, c.name as category_name, c.color as category_color 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?
    ORDER BY p.name
  `, [searchTerm, searchTerm, searchTerm]);
});

ipcMain.handle('db:products:getByBarcode', (_, barcode) => {
  return getOne(`
    SELECT p.*, c.name as category_name, c.color as category_color 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.barcode = ?
  `, [barcode]);
});

ipcMain.handle('db:products:getByCategory', (_, categoryId) => {
  return runQuery(`
    SELECT p.*, c.name as category_name, c.color as category_color 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.category_id = ?
    ORDER BY p.name
  `, [categoryId]);
});

ipcMain.handle('db:products:create', (_, product) => {
  runInsert(`
    INSERT INTO products (id, sku, barcode, name, description, category_id, price, cost, stock_quantity, min_stock_level, tax_rate, is_active, image_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [product.id, product.sku, product.barcode, product.name, product.description,
  product.category_id, product.price, product.cost, product.stock_quantity,
  product.min_stock_level, product.tax_rate, product.is_active ? 1 : 0, product.image_path]);
  return product;
});

ipcMain.handle('db:products:update', (_, product) => {
  runInsert(`
    UPDATE products SET 
      sku = ?, barcode = ?, name = ?, description = ?, category_id = ?,
      price = ?, cost = ?, stock_quantity = ?, min_stock_level = ?,
      tax_rate = ?, is_active = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [product.sku, product.barcode, product.name, product.description, product.category_id,
  product.price, product.cost, product.stock_quantity, product.min_stock_level,
  product.tax_rate, product.is_active ? 1 : 0, product.image_path, product.id]);
  return product;
});

ipcMain.handle('db:products:delete', (_, id) => {
  runInsert('DELETE FROM products WHERE id = ?', [id]);
  return true;
});

ipcMain.handle('db:products:updateStock', (_, { id, quantity, type, reason, employeeId }) => {
  const product = getOne('SELECT stock_quantity FROM products WHERE id = ?', [id]);
  const newQuantity = type === 'add' ? product.stock_quantity + quantity : product.stock_quantity - quantity;

  runInsert('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQuantity, id]);

  // Log inventory change
  runInsert(`
    INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, employee_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [uuid(), id, type, quantity, product.stock_quantity, newQuantity, reason, employeeId]);

  return { id, stock_quantity: newQuantity };
});

// Customers
ipcMain.handle('db:customers:getAll', () => {
  return runQuery('SELECT * FROM customers ORDER BY name');
});

ipcMain.handle('db:customers:getById', (_, id) => {
  return getOne('SELECT * FROM customers WHERE id = ?', [id]);
});

ipcMain.handle('db:customers:search', (_, query) => {
  const searchTerm = `%${query}%`;
  return runQuery('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY name',
    [searchTerm, searchTerm, searchTerm]);
});

ipcMain.handle('db:customers:create', (_, customer) => {
  runInsert(`
    INSERT INTO customers (id, name, email, phone, address, loyalty_points, notes, credit_enabled, credit_limit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    customer.id,
    customer.name,
    customer.email,
    customer.phone,
    customer.address,
    customer.loyalty_points || 0,
    customer.notes,
    customer.credit_enabled ? 1 : 0,
    customer.credit_limit || 0
  ]);
  return customer;
});

ipcMain.handle('db:customers:update', (_, customer) => {
  runInsert(`
    UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, loyalty_points = ?, notes = ?, credit_enabled = ?, credit_limit = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    customer.name,
    customer.email,
    customer.phone,
    customer.address,
    customer.loyalty_points,
    customer.notes,
    customer.credit_enabled ? 1 : 0,
    customer.credit_limit || 0,
    customer.id
  ]);
  return customer;
});

ipcMain.handle('db:customers:delete', (_, id) => {
  runInsert('DELETE FROM customers WHERE id = ?', [id]);
  return true;
});

// Employees
ipcMain.handle('db:employees:getAll', () => {
  return runQuery('SELECT id, name, email, role, is_active, avatar_path, created_at FROM employees ORDER BY name');
});

ipcMain.handle('db:employees:getById', (_, id) => {
  return getOne('SELECT id, name, email, role, is_active, avatar_path, created_at FROM employees WHERE id = ?', [id]);
});

ipcMain.handle('db:employees:verifyPin', (_, { id, pin }) => {
  const employee = getOne('SELECT * FROM employees WHERE id = ? AND pin = ?', [id, pin]);
  return employee ? { id: employee.id, name: employee.name, role: employee.role } : null;
});

ipcMain.handle('db:employees:create', (_, employee) => {
  runInsert(`
    INSERT INTO employees (id, name, email, pin, role, is_active, avatar_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    employee.id,
    employee.name,
    employee.email || null,
    employee.pin,
    employee.role,
    employee.is_active ? 1 : 0,
    employee.avatar_path || null
  ]);
  return { ...employee, pin: undefined };
});

ipcMain.handle('db:employees:update', (_, employee) => {
  if (employee.pin) {
    runInsert(`
      UPDATE employees SET name = ?, email = ?, pin = ?, role = ?, is_active = ?, avatar_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      employee.name,
      employee.email || null,
      employee.pin,
      employee.role,
      employee.is_active ? 1 : 0,
      employee.avatar_path || null,
      employee.id
    ]);
  } else {
    runInsert(`
      UPDATE employees SET name = ?, email = ?, role = ?, is_active = ?, avatar_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      employee.name,
      employee.email || null,
      employee.role,
      employee.is_active ? 1 : 0,
      employee.avatar_path || null,
      employee.id
    ]);
  }
  return { ...employee, pin: undefined };
});

ipcMain.handle('db:employees:delete', (_, id) => {
  runInsert('DELETE FROM employees WHERE id = ?', [id]);
  return true;
});

// Sales
ipcMain.handle('db:sales:create', (_, sale) => {
  runInsert(`
    INSERT INTO sales (id, receipt_number, employee_id, customer_id, subtotal, tax_amount, discount_amount, total, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [sale.id, sale.receipt_number, sale.employee_id, sale.customer_id,
  sale.subtotal, sale.tax_amount, sale.discount_amount, sale.total, sale.status, sale.notes]);

  for (const item of sale.items) {
    runInsert(`
      INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, tax_amount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [item.id, sale.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.discount, item.tax_amount, item.total]);

    // Update stock logic (Handling Products vs Bundles)
    const productExists = getOne('SELECT id FROM products WHERE id = ?', [item.product_id]);

    if (productExists) {
      // It's a regular product
      runInsert('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product_id]);

      // Log inventory movement
      runInsert(`
            INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, created_at)
            SELECT ?, ?, 'sale', ?, stock_quantity + ?, stock_quantity, ?, CURRENT_TIMESTAMP
            FROM products WHERE id = ?
        `, [uuid(), item.product_id, -item.quantity, item.quantity, `Sale #${sale.receipt_number}`, item.product_id]);

    } else {
      // Check if it's a bundle
      const bundle = getOne('SELECT * FROM bundles WHERE id = ?', [item.product_id]);

      if (bundle && bundle.deduct_component_stock === 1) {
        const bundleItems = runQuery('SELECT * FROM bundle_items WHERE bundle_id = ?', [bundle.id]);

        for (const bItem of bundleItems) {
          // Deduct stock from component product
          runInsert('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [bItem.quantity * item.quantity, bItem.product_id]);

          // Log inventory movement for component
          runInsert(`
                    INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, created_at)
                    SELECT ?, ?, 'sale_bundle', ?, stock_quantity + ?, stock_quantity, ?, CURRENT_TIMESTAMP
                    FROM products WHERE id = ?
                `, [uuid(), bItem.product_id, -(bItem.quantity * item.quantity), (bItem.quantity * item.quantity), `Bundle Sale: ${bundle.name} (Sale #${sale.receipt_number})`, bItem.product_id]);
        }
      } else if (bundle) {
        // Deduct stock from bundle itself (Pre-packed)
        runInsert('UPDATE bundles SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, bundle.id]);
      }
    }
  }

  for (const payment of sale.payments) {
    runInsert(`
      INSERT INTO payments (id, sale_id, method, amount, reference)
      VALUES (?, ?, ?, ?, ?)
    `, [payment.id, sale.id, payment.method, payment.amount, payment.reference]);

    // Handle Gift Card Redemption
    if (payment.method === 'gift_card') {
      const code = payment.reference; // Reference holds the gift card code
      const amount = payment.amount;

      const card = getOne('SELECT * FROM gift_cards WHERE code = ?', [code]);
      if (card) {
        const newBalance = card.current_balance - amount;
        if (newBalance < 0) throw new Error(`Insufficient balance on Gift Card ${code}`);

        runInsert('UPDATE gift_cards SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newBalance, card.id]);

        // Update payment reference with balance info for receipt
        const refData = JSON.stringify({ code: code, remaining: newBalance });
        runInsert('UPDATE payments SET reference = ? WHERE id = ?', [refData, payment.id]);

        // Log transaction
        runInsert(`
          INSERT INTO gift_card_transactions (id, gift_card_id, sale_id, amount, type, balance_before, balance_after, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [uuid(), card.id, sale.id, amount, 'redeem', card.current_balance, newBalance]);
      } else {
        console.warn(`Gift Card ${code} not found during payment processing`);
      }
    }
  }

  return sale;
});

ipcMain.handle('db:sales:getAll', (_, params = {}) => {
  let query = `
    SELECT s.*, e.name as employee_name, c.name as customer_name
    FROM sales s
    LEFT JOIN employees e ON s.employee_id = e.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (params?.startDate && params?.endDate) {
    query += ' AND s.created_at BETWEEN ? AND ?';
    queryParams.push(params.startDate, params.endDate);
  }

  if (params?.employeeId) {
    query += ' AND s.employee_id = ?';
    queryParams.push(params.employeeId);
  }

  query += ' ORDER BY s.created_at DESC';

  // Limit if no date range to avoid fetching everything
  if (!params?.startDate) {
    query += ' LIMIT 100';
  }

  return runQuery(query, queryParams);
});

ipcMain.handle('db:sales:getById', (_, id) => {
  const sale = getOne(`
    SELECT s.*, e.name as employee_name, c.name as customer_name
    FROM sales s
    LEFT JOIN employees e ON s.employee_id = e.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ?
  `, [id]);

  if (sale) {
    sale.items = runQuery('SELECT * FROM sale_items WHERE sale_id = ?', [id]);
    sale.payments = runQuery('SELECT * FROM payments WHERE sale_id = ?', [id]);
  }

  return sale;
});

ipcMain.handle('db:sales:getToday', (_, params = {}) => {
  const today = new Date().toISOString().split('T')[0];
  let query = `
    SELECT s.*, e.name as employee_name
    FROM sales s
    LEFT JOIN employees e ON s.employee_id = e.id
    WHERE date(s.created_at) = date(?)
  `;
  const queryParams = [today];

  if (params?.employeeId) {
    query += ' AND s.employee_id = ?';
    queryParams.push(params.employeeId);
  }

  query += ' ORDER BY s.created_at DESC';
  return runQuery(query, queryParams);
});

ipcMain.handle('db:sales:getStats', (_, { startDate, endDate, employeeId }) => {
  let query = `
    SELECT 
      COUNT(*) as total_transactions,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as average_sale,
      COALESCE(SUM(tax_amount), 0) as total_tax
    FROM sales
    WHERE created_at BETWEEN ? AND ?
  `;
  const queryParams = [startDate, endDate];

  if (employeeId) {
    query += ' AND employee_id = ?';
    queryParams.push(employeeId);
  }

  const result = runQuery(query, queryParams);
  return result.length > 0 ? result[0] : { total_transactions: 0, total_revenue: 0, average_sale: 0, total_tax: 0 };
});

// Held Transactions
ipcMain.handle('db:held:getAll', () => {
  return runQuery(`
    SELECT h.*, e.name as employee_name, c.name as customer_name
    FROM held_transactions h
    LEFT JOIN employees e ON h.employee_id = e.id
    LEFT JOIN customers c ON h.customer_id = c.id
    ORDER BY h.created_at DESC
  `);
});

ipcMain.handle('db:held:create', (_, held) => {
  runInsert(`
    INSERT INTO held_transactions (id, employee_id, customer_id, items_json, subtotal, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [held.id, held.employee_id, held.customer_id, JSON.stringify(held.items), held.subtotal, held.notes]);
  return held;
});

ipcMain.handle('db:held:delete', (_, id) => {
  runInsert('DELETE FROM held_transactions WHERE id = ?', [id]);
  return true;
});

// Settings
ipcMain.handle('db:settings:get', (_, key) => {
  const row = getOne('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? JSON.parse(row.value) : null;
});

ipcMain.handle('db:settings:set', (_, { key, value }) => {
  const jsonValue = JSON.stringify(value);
  const existing = getOne('SELECT key FROM settings WHERE key = ?', [key]);
  if (existing) {
    runInsert('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [jsonValue, key]);
  } else {
    runInsert('INSERT INTO settings (key, value) VALUES (?, ?)', [key, jsonValue]);
  }
  return true;
});

ipcMain.handle('db:settings:getAll', () => {
  const rows = runQuery('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach(row => {
    settings[row.key] = JSON.parse(row.value);
  });
  return settings;
});

// Inventory Logs
ipcMain.handle('db:inventory:getLogs', (_, productId) => {
  if (productId) {
    return runQuery(`
      SELECT il.*, p.name as product_name, e.name as employee_name
      FROM inventory_logs il
      LEFT JOIN products p ON il.product_id = p.id
      LEFT JOIN employees e ON il.employee_id = e.id
      WHERE il.product_id = ?
      ORDER BY il.created_at DESC
    `, [productId]);
  }
  return runQuery(`
    SELECT il.*, p.name as product_name, e.name as employee_name
    FROM inventory_logs il
    LEFT JOIN products p ON il.product_id = p.id
    LEFT JOIN employees e ON il.employee_id = e.id
    ORDER BY il.created_at DESC
    LIMIT 100
  `);
});

ipcMain.handle('db:inventory:getLowStock', () => {
  return runQuery(`
    SELECT * FROM products 
    WHERE stock_quantity <= min_stock_level AND is_active = 1
    ORDER BY stock_quantity ASC
  `);
});

// Reports
ipcMain.handle('db:reports:salesByDate', (_, { startDate, endDate, employeeId }) => {
  let query = `
    SELECT 
      date(created_at) as date,
      COUNT(*) as transactions,
      SUM(total) as revenue,
      SUM(tax_amount) as tax
    FROM sales
    WHERE created_at BETWEEN ? AND ?
  `;
  const queryParams = [startDate, endDate];

  if (employeeId) {
    query += ' AND employee_id = ?';
    queryParams.push(employeeId);
  }

  query += `
    GROUP BY date(created_at)
    ORDER BY date ASC
  `;

  return runQuery(query, queryParams);
});

ipcMain.handle('db:reports:topProducts', (_, { startDate, endDate, limit = 10, employeeId }) => {
  let query = `
    SELECT 
      si.product_id,
      si.product_name,
      SUM(si.quantity) as total_quantity,
      SUM(si.total) as total_revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.created_at BETWEEN ? AND ?
  `;
  const queryParams = [startDate, endDate];

  if (employeeId) {
    query += ' AND s.employee_id = ?';
    queryParams.push(employeeId);
  }

  query += `
    GROUP BY si.product_id
    ORDER BY total_quantity DESC
    LIMIT ?
  `;
  queryParams.push(limit);

  return runQuery(query, queryParams);
});

ipcMain.handle('db:reports:salesByCategory', (_, { startDate, endDate, employeeId }) => {
  let query = `
    SELECT 
      c.name as category_name,
      c.color as category_color,
      SUM(si.quantity) as total_quantity,
      SUM(si.total) as total_revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE s.created_at BETWEEN ? AND ?
  `;
  const queryParams = [startDate, endDate];

  if (employeeId) {
    query += ' AND s.employee_id = ?';
    queryParams.push(employeeId);
  }

  query += `
    GROUP BY p.category_id
    ORDER BY total_revenue DESC
  `;

  return runQuery(query, queryParams);
});

ipcMain.handle('db:reports:paymentMethods', (_, { startDate, endDate, employeeId }) => {
  let query = `
    SELECT 
      p.method,
      COUNT(*) as count,
      SUM(p.amount) as total
    FROM payments p
    JOIN sales s ON p.sale_id = s.id
    WHERE s.created_at BETWEEN ? AND ?
  `;
  const queryParams = [startDate, endDate];

  if (employeeId) {
    query += ' AND s.employee_id = ?';
    queryParams.push(employeeId);
  }

  query += ' GROUP BY p.method';

  return runQuery(query, queryParams);
});

// Generate receipt number
ipcMain.handle('db:generateReceiptNumber', () => {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const results = runQuery(`
    SELECT receipt_number FROM sales 
    WHERE receipt_number LIKE ?
    ORDER BY receipt_number DESC LIMIT 1
  `, [`${today}%`]);

  let sequence = 1;
  if (results.length > 0) {
    const lastSequence = parseInt(results[0].receipt_number.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${today}${sequence.toString().padStart(4, '0')}`;
});

// ==========================================
// RETURNS
// ==========================================
ipcMain.handle('db:returns:getAll', (_, params = {}) => {
  let query = `
    SELECT r.*, e.name as employee_name, s.receipt_number
    FROM returns r
    LEFT JOIN employees e ON r.employee_id = e.id
    LEFT JOIN sales s ON r.sale_id = s.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (params?.employeeId) {
    // If filtering by employee, we arguably want see returns PROCESSED by this employee 
    // OR returns of sales MADE by this employee.
    // Requirement says "History should each users transaction not all". 
    // Usually means "transactions I performed". 
    // For Returns, it's the person who processed the return.
    query += ' AND r.employee_id = ?';
    queryParams.push(params.employeeId);
  }

  query += ' ORDER BY r.created_at DESC';

  return runQuery(query, queryParams);
});

ipcMain.handle('db:returns:getItems', (_, returnId) => {
  return runQuery(`
    SELECT ri.*, p.name as product_name
    FROM return_items ri
    LEFT JOIN products p ON ri.product_id = p.id
    WHERE ri.return_id = ?
  `, [returnId]);
});

ipcMain.handle('db:returns:create', (_, returnData) => {
  // Insert the return record
  runInsert(`
    INSERT INTO returns (id, sale_id, return_number, total_refund, reason, employee_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [returnData.id, returnData.sale_id, returnData.return_number, returnData.total_refund, returnData.reason, returnData.employee_id]);

  // Insert return items
  for (const item of returnData.items) {
    runInsert(`
      INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, refund_amount, condition)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [uuid(), returnData.id, item.sale_item_id, item.product_id, item.quantity, item.refund_amount, item.condition]);

    // Restock if sellable
    if (item.condition === 'sellable') {
      const product = getOne('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
      const currentStock = product ? product.stock_quantity : 0;
      const newStock = currentStock + item.quantity;

      runInsert('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, item.product_id]);

      runInsert(`
        INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [uuid(), item.product_id, 'return', item.quantity, currentStock, newStock, `Return: ${returnData.return_number}`]);
    }
  }

  // Check if sale is fully or partially refunded
  const sale = getOne('SELECT total FROM sales WHERE id = ?', [returnData.sale_id]);
  const allReturns = runQuery('SELECT SUM(total_refund) as total_returned FROM returns WHERE sale_id = ?', [returnData.sale_id]);
  const totalReturned = allReturns[0]?.total_returned || 0;

  // Get original sale items total (before any discounts)
  const saleItems = runQuery('SELECT SUM(quantity * unit_price) as items_total FROM sale_items WHERE sale_id = ?', [returnData.sale_id]);
  const itemsTotal = saleItems[0]?.items_total || sale.total;

  // Determine status: fully refunded if total returned >= items total
  const newStatus = totalReturned >= itemsTotal ? 'refunded' : 'partially_refunded';

  runInsert('UPDATE sales SET status = ? WHERE id = ?', [newStatus, returnData.sale_id]);

  return returnData;
});

// ================================================
// PHASE 2: ADVANCED FEATURES
// ================================================

const { saveImage, saveImageFromPath, deleteImage, getImageBase64 } = require('./services/imageService');
const { testEmailConnection, sendTestEmail, sendReceiptEmail, initEmailService } = require('./services/emailService');

// Image Service
ipcMain.handle('images:save', async (_, { base64Data, originalName }) => {
  return saveImage(base64Data, originalName);
});

ipcMain.handle('images:saveFromPath', async (_, sourcePath) => {
  return saveImageFromPath(sourcePath);
});

ipcMain.handle('images:delete', (_, fileName) => {
  return deleteImage(fileName);
});

ipcMain.handle('images:get', (_, fileName) => {
  return getImageBase64(fileName);
});

ipcMain.handle('images:getPath', (_, fileName) => {
  const { getImagePath } = require('./services/imageService');
  return getImagePath(fileName);
});

// File Dialog for selecting an image
ipcMain.handle('dialog:selectImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Signature Image',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  // Save the image to app data
  const imageService = require('./services/imageService');
  const savedImage = await imageService.saveImageFromPath(result.filePaths[0]);
  return savedImage;
});

// Email Service
ipcMain.handle('email:testConnection', async (_, settings) => {
  return testEmailConnection(settings);
});

ipcMain.handle('email:sendTest', async (_, { settings, toEmail }) => {
  return sendTestEmail(settings, toEmail);
});

// Send Purchase Order Email
const nodemailer = require('nodemailer');
ipcMain.handle('email:sendPurchaseOrder', async (_, { to, po }) => {
  // Get business settings including SMTP
  const settingsRows = runQuery('SELECT key, value FROM settings');
  const settings = {};
  settingsRows.forEach(row => {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch (e) {
      settings[row.key] = row.value;
    }
  });

  console.log('Email settings loaded:', {
    email_host: settings.email_host,
    email_user: settings.email_user,
    email_password: settings.email_password ? '***SET***' : 'NOT SET',
    email_port: settings.email_port,
  });

  // Check SMTP settings
  if (!settings.email_host || !settings.email_user || !settings.email_password) {
    throw new Error(`Email not configured. Missing: ${!settings.email_host ? 'host ' : ''}${!settings.email_user ? 'user ' : ''}${!settings.email_password ? 'password' : ''}`);
  }

  // Fetch full PO with items if items are missing
  let fullPO = po;
  if (!po.items || po.items.length === 0) {
    fullPO = getOne(`
      SELECT po.*, s.name as supplier_name, s.email as supplier_email, s.phone as supplier_phone, s.address as supplier_address, s.contact_person as supplier_contact_person
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `, [po.id]);

    if (fullPO) {
      fullPO.items = runQuery(`
        SELECT poi.*, p.name as product_name, p.sku
        FROM purchase_order_items poi
        LEFT JOIN products p ON poi.product_id = p.id
        WHERE poi.purchase_order_id = ?
      `, [po.id]);
    }
  }

  // Create transporter with settings
  const transporter = nodemailer.createTransport({
    host: settings.email_host,
    port: settings.email_port || 587,
    secure: settings.email_secure || false,
    auth: {
      user: settings.email_user,
      pass: settings.email_password,
    },
  });

  // Build modern email HTML
  const itemsHtml = (fullPO.items || []).map((item, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 12px 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${item.product_name}</td>
      <td class="mobile-hide" style="padding: 12px 16px; color: #475569; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
      <td class="mobile-hide" style="padding: 12px 16px; color: #475569; text-align: right; border-bottom: 1px solid #e2e8f0;">$${(item.unit_cost || 0).toFixed(2)}</td>
      <td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 600; border-bottom: 1px solid #e2e8f0;">$${(item.total_cost || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Order</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; margin: 20px 0 !important; border-radius: 0 !important; }
          .content { padding: 20px !important; }
          .header { padding: 20px !important; }
          .info-grid { flex-direction: column !important; gap: 20px; }
          .info-grid > div { text-align: left !important; padding: 0 !important; }
          .mobile-hide { display: none !important; }
          h1 { font-size: 20px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
      <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); margin-top: 40px; margin-bottom: 40px;">
        
        <!-- Header -->
        <div class="header" style="background-color: #10b981; padding: 32px 40px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Purchase Order</h1>
          <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">#${fullPO.po_number || fullPO.id?.slice(0, 8)}</p>
        </div>

        <!-- Content -->
        <div class="content" style="padding: 40px;">
          
          <!-- Context -->
          <div style="margin-bottom: 32px; text-align: center; color: #64748b; font-size: 16px; line-height: 1.5;">
            <p>Hello ${fullPO.supplier_contact_person || fullPO.supplier_name || 'Supplier'},</p>
            <p>Please find attached our purchase order. We would appreciate if you could process this order at your earliest convenience.</p>
          </div>

          <!-- Info Grid -->
          <div class="info-grid" style="display: flex; justify-content: space-between; margin-bottom: 32px; background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="flex: 1; padding-right: 20px;">
              <h3 style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">From</h3>
              <p style="margin: 0; color: #0f172a; font-weight: 600;">${settings.businessName || 'Our Company'}</p>
              <p style="margin: 4px 0 0; color: #475569; font-size: 14px;">${settings.businessEmail || ''}</p>
            </div>
            <div style="flex: 1; text-align: right;">
              <h3 style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">To</h3>
              <p style="margin: 0; color: #0f172a; font-weight: 600;">${fullPO.supplier_name || 'Supplier'}</p>
              <p style="margin: 4px 0 0; color: #475569; font-size: 14px;">${fullPO.supplier_email || ''}</p>
            </div>
          </div>

          <!-- Table -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 32px;">
            <thead>
              <tr>
                <th style="background-color: #f8fafc; padding: 12px 16px; text-align: left; color: #64748b; font-weight: 600; font-size: 13px; border-bottom: 2px solid #e2e8f0; border-top-left-radius: 6px;">ITEM</th>
                <th class="mobile-hide" style="background-color: #f8fafc; padding: 12px 16px; text-align: center; color: #64748b; font-weight: 600; font-size: 13px; border-bottom: 2px solid #e2e8f0;">QTY</th>
                <th class="mobile-hide" style="background-color: #f8fafc; padding: 12px 16px; text-align: right; color: #64748b; font-weight: 600; font-size: 13px; border-bottom: 2px solid #e2e8f0;">UNIT COST</th>
                <th style="background-color: #f8fafc; padding: 12px 16px; text-align: right; color: #64748b; font-weight: 600; font-size: 13px; border-bottom: 2px solid #e2e8f0; border-top-right-radius: 6px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="mobile-hide" style="padding: 20px 16px; text-align: right; font-weight: 600; color: #64748b;">Total Amount:</td>
                <td colspan="1" style="padding: 20px 16px; text-align: right; font-weight: 700; color: #0f172a; font-size: 18px;">$${(fullPO.total || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          ${fullPO.notes ? `
            <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 16px; margin-bottom: 32px;">
              <h4 style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">Notes:</h4>
              <p style="margin: 0; color: #b45309; font-size: 14px;">${fullPO.notes}</p>
            </div>
          ` : ''}

          <!-- Footer -->
          <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 32px;">
            <p style="margin: 0 0 8px; color: #64748b; font-weight: 500;">Please verify this order and confirm receipt.</p>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">${settings.businessName || ''} &bull; ${settings.businessPhone || ''}</p>
          </div>
          
        </div>
      </div>
      
      <div style="text-align: center; padding-bottom: 40px; color: #94a3b8; font-size: 12px;">
        <p>Sent via POSbyCirvex</p>
      </div>
    </body>
    </html>
  `;

  // Generate PDF to attach
  let pdfPath = null;
  try {
    console.log('Generating PDF for email attachment...');
    pdfPath = await receiptService.generatePurchaseOrderPdf(fullPO, { type: 'purchase_order', ...settings });
    console.log('Email PDF generated at:', pdfPath);
  } catch (pdfError) {
    console.error('PDF generation failed, sending email without attachment:', pdfError);
  }

  // Build attachments array
  const attachments = [];
  if (pdfPath) {
    const fs = require('fs');
    if (fs.existsSync(pdfPath)) {
      console.log('Attaching PDF to email:', pdfPath);
      attachments.push({
        filename: `PO_${fullPO.po_number || 'draft'}.pdf`,
        path: pdfPath,
      });
    } else {
      console.error('Generated PDF file not found at path:', pdfPath);
    }
  } else {
    console.warn('pdfPath is null or undefined');
  }

  // Send email
  await transporter.sendMail({
    from: settings.email_user,
    to,
    subject: `Purchase Order #${fullPO.po_number || fullPO.id?.slice(0, 8)} from ${settings.businessName || 'POSbyCirvex'}`,
    html,
    attachments,
  });

  return { success: true };
});

// ==========================================
// RECEIPTS
// ==========================================


// ==========================================  
// EMAIL: SEND RECEIPT
// ==========================================
ipcMain.handle('email:sendReceipt', async (_, sale, toEmail) => {
  const settingsRows = runQuery('SELECT key, value FROM settings');
  const settings = {};
  settingsRows.forEach(row => {
    try { settings[row.key] = JSON.parse(row.value); } catch (e) { settings[row.key] = row.value; }
  });

  if (!settings.email_host || !settings.email_user || !settings.email_password) {
    throw new Error('Email not configured. Please configure SMTP settings in Settings > Email.');
  }

  // Determine if this is a credit payment
  const isCreditPayment = sale.type === 'credit_payment' || (sale.invoice_number && !sale.receipt_number);

  // Normalize data for email template
  const receiptNumber = sale.receipt_number || sale.invoice_number || 'N/A';
  const totalAmount = isCreditPayment ? (sale.amount || 0) : (sale.total || 0);
  const dateStr = new Date(sale.created_at).toLocaleString();

  // Ensure sale has items (only for standard sales)
  if (!isCreditPayment && (!sale.items || sale.items.length === 0)) {
    const items = runQuery('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
    sale.items = items;
  }

  const transporter = nodemailer.createTransport({
    host: settings.email_host,
    port: settings.email_port || 587,
    secure: settings.email_secure || false,
    auth: { user: settings.email_user, pass: settings.email_password },
  });

  let itemsHtml = '';
  if (isCreditPayment) {
    itemsHtml = `
      <tr>
        <td>Payment for Invoice #${sale.invoice_number}</td>
        <td>1</td>
        <td>$${totalAmount.toFixed(2)}</td>
        <td>$${totalAmount.toFixed(2)}</td>
      </tr>
    `;
  } else {
    itemsHtml = (sale.items || []).map(item => `
      <tr><td>${item.product_name}</td><td>${item.quantity}</td><td>$${(item.unit_price || 0).toFixed(2)}</td><td>$${(item.total || 0).toFixed(2)}</td></tr>
    `).join('');
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #6366f1;">${settings.businessName || 'Receipt'}</h1>
      <p><strong>Receipt #:</strong> ${receiptNumber}</p>
      <p><strong>Date:</strong> ${dateStr}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead><tr style="background: #f3f4f6;"><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="font-size: 20px; font-weight: bold;">Total: $${totalAmount.toFixed(2)}</p>
      <p style="color: #6b7280; margin-top: 30px;">${settings.receiptFooter || 'Thank you for your business!'}</p>
    </div>
  `;

  // Generate PDF to attach
  let pdfPath = null;
  try {
    // Pass the correct type to generatePdf so it uses the right template logic
    const pdfType = isCreditPayment ? 'credit_payment' : 'receipt';
    pdfPath = await receiptService.generatePdf(sale, { ...settings, type: pdfType });
  } catch (pdfError) {
    console.error('Receipt PDF generation failed, sending email without attachment:', pdfError);
  }

  // Build attachments array
  const attachments = [];
  if (pdfPath) {
    const fs = require('fs');
    if (fs.existsSync(pdfPath)) {
      attachments.push({
        filename: `Receipt_${receiptNumber}.pdf`,
        path: pdfPath,
      });
    }
  }

  await transporter.sendMail({
    from: settings.email_user,
    to: toEmail,
    subject: `Receipt #${receiptNumber} from ${settings.businessName || 'POSbyCirvex'}`,
    html,
    attachments,
  });

  return { success: true };
});

// ==========================================
// PURCHASE ORDERS: SAVE PDF
// ==========================================
ipcMain.handle('purchaseOrders:savePdf', async (_, po) => {
  try {
    const settingsRows = runQuery('SELECT key, value FROM settings');
    const storeSettings = {};
    settingsRows.forEach(row => {
      try { storeSettings[row.key] = JSON.parse(row.value); } catch (e) { storeSettings[row.key] = row.value; }
    });
    storeSettings.type = 'purchase_order';

    // Fetch full PO with items if missing
    let fullPO = po;
    if (!po.items || po.items.length === 0) {
      fullPO = getOne(`
        SELECT po.*, s.name as supplier_name, s.email as supplier_email, s.phone as supplier_phone, s.address as supplier_address
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.id = ?
      `, [po.id]);

      if (fullPO) {
        fullPO.items = runQuery(`
          SELECT poi.*, p.name as product_name, p.sku
          FROM purchase_order_items poi
          LEFT JOIN products p ON poi.product_id = p.id
          WHERE poi.purchase_order_id = ?
        `, [po.id]);
      }
    }

    // Show save dialog
    const { shell } = require('electron');
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Purchase Order PDF',
      defaultPath: `PO_${fullPO.po_number || 'draft'}.pdf`,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    console.log('Generating PO PDF for:', fullPO?.po_number || fullPO?.id);
    const pdfPath = await receiptService.generatePurchaseOrderPdf(fullPO, storeSettings, result.filePath);
    console.log('PDF saved to:', pdfPath);

    // Open the PDF after saving
    shell.openPath(pdfPath);

    return pdfPath;
  } catch (error) {
    console.error('PO PDF generation error:', error);
    throw error;
  }
});

// ==========================================
// SUPPLIERS & RETURNS
// ==========================================
ipcMain.handle('db:suppliers:getAll', () => {
  return runQuery('SELECT * FROM suppliers ORDER BY name');
});

ipcMain.handle('db:suppliers:getById', (_, id) => {
  return getOne('SELECT * FROM suppliers WHERE id = ?', [id]);
});

// Get Supplier History (POs, Payments, Returns)
ipcMain.handle('db:suppliers:getHistory', (_, supplierId) => {
  const history = runQuery(`
    SELECT 
      'purchase_order' as type,
      id,
      po_number as reference,
      created_at as date,
      total as amount,
      status,
      payment_status
    FROM purchase_orders 
    WHERE supplier_id = ?
    
    UNION ALL
    
    SELECT 
      'payment' as type,
      id,
      payment_method as reference, -- e.g. "Bank Transfer"
      paid_at as date,
      amount,
      'completed' as status,
      NULL as payment_status
    FROM supplier_payments
    WHERE supplier_id = ?
    
    UNION ALL
    
    SELECT 
      'return' as type,
      id,
      return_number as reference,
      created_at as date,
      total_amount as amount,
      status,
      NULL as payment_status
    FROM purchase_returns
    WHERE supplier_id = ?
    
    ORDER BY date DESC
  `, [supplierId, supplierId, supplierId]);

  return history;
});

// Record Supplier Payment
ipcMain.handle('db:supplierPayments:create', (_, data) => { // data: { purchase_order_id, supplier_id, amount, payment_method, reference, notes }
  const id = uuid();
  const { purchase_order_id, supplier_id, amount, payment_method, reference, notes } = data;

  try {
    // 1. Record Payment
    runInsert(`
      INSERT INTO supplier_payments (id, purchase_order_id, supplier_id, amount, payment_method, reference, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, purchase_order_id, supplier_id, amount, payment_method, reference, notes, 'system']); // TODO: pass user id

    // 2. Update Purchase Order (if linked)
    if (purchase_order_id) {
      const po = getOne('SELECT total, amount_paid FROM purchase_orders WHERE id = ?', [purchase_order_id]);
      if (po) {
        const newPaid = (po.amount_paid || 0) + amount;
        let newStatus = 'partial';
        if (newPaid >= po.total) newStatus = 'paid';
        if (newPaid === 0) newStatus = 'unpaid';

        runInsert('UPDATE purchase_orders SET amount_paid = ?, payment_status = ? WHERE id = ?',
          [newPaid, newStatus, purchase_order_id]);
      }
    }

    // 3. Update Supplier Balance (Reduce debt)
    // Note: Assuming 'balance' tracks what we OWE the supplier. Payment reduces it.
    // If balance tracks what they owe us, valid logic would be reversed. 
    // Convention: Supplier Balance = Amount We Owe.
    const supplier = getOne('SELECT balance FROM suppliers WHERE id = ?', [supplier_id]);
    const currentBalance = supplier ? (supplier.balance || 0) : 0;
    const newBalance = currentBalance - amount;
    runInsert('UPDATE suppliers SET balance = ? WHERE id = ?', [newBalance, supplier_id]);

    return { success: true, id };
  } catch (error) {
    console.error('Failed to record supplier payment:', error);
    throw error;
  }
});

// Create Purchase Return
ipcMain.handle('db:purchaseReturns:create', (_, data) => {
  const id = uuid();
  const { supplier_id, purchase_order_id, items, notes } = data; // items: [{product_id, quantity, unit_cost, reason}]

  try {
    // Calculate total
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const returnNumber = 'RET-' + Date.now().toString().slice(-6);

    // 1. Create Return Record
    runInsert(`
      INSERT INTO purchase_returns (id, return_number, purchase_order_id, supplier_id, total_amount, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, returnNumber, purchase_order_id, supplier_id, totalAmount, notes, 'complated']);

    // 2. Insert Items & Update Stock
    items.forEach(item => {
      runInsert(`
        INSERT INTO purchase_return_items (id, return_id, product_id, product_name, quantity, unit_cost, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [uuid(), id, item.product_id, item.product_name, item.quantity, item.unit_cost, item.reason]);

      // Reduce Stock (Returning to supplier means we lose stock)
      // LOGIC: quantity is positive in return item. We SUBTRACT from our inventory.
      const product = getOne('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
      if (product) {
        const newStock = Math.max(0, product.stock_quantity - item.quantity);
        runInsert('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, item.product_id]);

        // Log inventory change
        runInsert(`
            INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [uuid(), item.product_id, 'return_out', -item.quantity, product.stock_quantity, newStock, `Return #${returnNumber}`, new Date().toISOString()]);
      }
    });

    // 3. Update Supplier Balance (They owe us credit, or we owe them less)
    // Reduce what we owe them (Balance - Return Amount)
    const supplier = getOne('SELECT balance FROM suppliers WHERE id = ?', [supplier_id]);
    const currentBalance = supplier ? (supplier.balance || 0) : 0;
    const newBalance = currentBalance - totalAmount;
    runInsert('UPDATE suppliers SET balance = ? WHERE id = ?', [newBalance, supplier_id]);

    return { success: true, id, return_number: returnNumber };
  } catch (error) {
    console.error('Failed to create purchase return:', error);
    throw error;
  }
});

ipcMain.handle('db:suppliers:create', (_, supplier) => {
  runInsert(`
    INSERT INTO suppliers (id, name, email, phone, address, contact_person, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [supplier.id, supplier.name, supplier.email, supplier.phone, supplier.address, supplier.contact_person, supplier.website, supplier.notes]);
  return supplier;
});

ipcMain.handle('db:suppliers:update', (_, supplier) => {
  runInsert(`
    UPDATE suppliers SET 
      name = ?, email = ?, phone = ?, address = ?, contact_person = ?, website = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [supplier.name, supplier.email, supplier.phone, supplier.address, supplier.contact_person, supplier.website, supplier.notes, supplier.id]);
  return supplier;
});

ipcMain.handle('db:suppliers:delete', (_, id) => {
  runInsert('DELETE FROM suppliers WHERE id = ?', [id]);
  return true;
});

// ==========================================
// PURCHASE ORDERS
// ==========================================
ipcMain.handle('db:purchaseOrders:getAll', () => {
  return runQuery(`
    SELECT po.*, s.name as supplier_name, s.email as supplier_email, s.phone as supplier_phone, s.address as supplier_address
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    ORDER BY po.created_at DESC
  `);
});

ipcMain.handle('db:purchaseOrders:getById', (_, id) => {
  const po = getOne(`
    SELECT po.*, s.name as supplier_name, s.email as supplier_email, s.phone as supplier_phone, s.address as supplier_address
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = ?
  `, [id]);

  if (po) {
    po.items = runQuery(`
      SELECT poi.*, p.name as product_name, p.sku
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      WHERE poi.purchase_order_id = ?
    `, [id]);
  }

  return po;
});

ipcMain.handle('db:purchaseOrders:create', (_, po) => {
  const id = po.id || uuid();
  runInsert(`
    INSERT INTO purchase_orders (
      id, po_number, supplier_id, expected_date, 
      subtotal, tax_rate, tax_amount, discount_type, discount_value, shipping_cost, 
      total, status, notes, amount_paid, payment_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'unpaid')
  `, [
    id, po.po_number, po.supplier_id, po.expected_date,
    po.subtotal, po.tax_rate || 0, po.tax_amount, po.discount_type || 'fixed', po.discount_value || 0, po.shipping_cost || 0,
    po.total, po.status || 'draft', po.notes
  ]);

  // Insert PO items
  for (const item of po.items) {
    runInsert(`
      INSERT INTO purchase_order_items (id, purchase_order_id, product_id, product_name, quantity, unit_cost, tax_rate, tax_amount, discount_amount, total_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.id || uuid(), id, item.product_id, item.product_name, item.quantity, item.unit_cost,
      item.tax_rate || 0, item.tax_amount || 0, item.discount_amount || 0, item.total_cost
    ]);
  }

  return { ...po, id };
});

ipcMain.handle('db:purchaseOrders:delete', (_, id) => {
  // Check validation rules
  const po = getOne('SELECT status, amount_paid FROM purchase_orders WHERE id = ?', [id]);

  if (!po) {
    throw new Error('Purchase Order not found');
  }

  if (po.status === 'received') {
    throw new Error('Cannot delete a Received Purchase Order. Please use Returns instead.');
  }

  if (po.amount_paid > 0) {
    throw new Error('Cannot delete a Purchase Order with recorded payments.');
  }

  try {
    // Delete items first
    runInsert('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id]);
    // Delete PO
    runInsert('DELETE FROM purchase_orders WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Failed to delete PO:', error);
    throw error;
  }
});

// GOODS RECEIVING (GRN)
ipcMain.handle('db:receivings:create', (_, data) => {
  const { poId, items, notes } = data;
  const receivingId = uuid();
  const receiveNumber = 'GRN-' + Date.now().toString().slice(-6);

  try {
    // 1. Create Receiving Record
    runInsert(`
      INSERT INTO receivings (id, receive_number, purchase_order_id, supplier_id, notes)
      SELECT ?, ?, id, supplier_id, ? FROM purchase_orders WHERE id = ?
    `, [receivingId, receiveNumber, notes, poId]);

    let allItemsFullyReceived = true;

    // 2. Process Items
    for (const item of items) {
      if (item.quantity_received > 0) {
        // Add Receiving Item
        runInsert(`
          INSERT INTO receiving_items (id, receiving_id, product_id, product_name, quantity_ordered, quantity_received)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [uuid(), receivingId, item.product_id, item.product_name, item.quantity_ordered, item.quantity_received]);

        // Update PO Item Received Qty
        runInsert(`
          UPDATE purchase_order_items 
          SET received_quantity = received_quantity + ?
          WHERE id = ?
        `, [item.quantity_received, item.po_item_id]);

        // Update Product Stock
        runInsert(`
          UPDATE products
          SET stock_quantity = stock_quantity + ?
          WHERE id = ?
        `, [item.quantity_received, item.product_id]);

        // Log Inventory
        runInsert(`
          INSERT INTO inventory_logs (id, product_id, type, quantity, reason, reference_id)
          VALUES (?, ?, 'purchase', ?, ?, ?)
        `, [uuid(), item.product_id, item.quantity_received, `GRN: ${receiveNumber}`, receivingId]);
      }
    }

    // 3. Check PO Status
    // Get all items for this PO to check if everything is received
    const poItems = runQuery('SELECT quantity, received_quantity FROM purchase_order_items WHERE purchase_order_id = ?', [poId]);
    const isFullyReceived = poItems.every(i => i.received_quantity >= i.quantity);
    const isPartial = poItems.some(i => i.received_quantity > 0);

    const newStatus = isFullyReceived ? 'received' : (isPartial ? 'partial' : 'sent');

    runInsert('UPDATE purchase_orders SET status = ? WHERE id = ?', [newStatus, poId]);

    return { id: receivingId, receive_number: receiveNumber };
  } catch (error) {
    console.error('Failed to create GRN:', error);
    throw error;
  }
});

// SUPPLIER INVOICES (Phase 3)
ipcMain.handle('db:supplierInvoices:create', (_, data) => {
  const id = uuid();
  const { purchase_order_id, invoice_number, invoice_date, due_date, subtotal, tax_amount, total_amount, notes } = data;

  try {
    // 1. Perform 3-Way Match Validation Check
    // Get PO Total
    const po = getOne('SELECT total FROM purchase_orders WHERE id = ?', [purchase_order_id]);

    // Get GRN Value (Sum of received items * unit cost)
    // Note: This relies on unit_cost from PO items. Detailed GRN valuation might need actual cost at receipt if different.
    // For now assuming PO cost.
    const grnValue = getOne(`
      SELECT SUM(quantity_received * unit_cost) as total_received_value 
      FROM purchase_order_items 
      WHERE purchase_order_id = ?
    `, [purchase_order_id]);

    const poTotal = po ? po.total : 0;
    const receivedValue = grnValue ? grnValue.total_received_value : 0;

    // Simple Match Logic: Does Invoice Total match PO Total (or Received Value)? 
    // Usually Invoice should match Received Value for partials, or PO total for full.
    // Let's match against PO Total for now as per requirement "PO vs Invoice".
    // Allowing small floating point difference.
    const difference = Math.abs(total_amount - poTotal);
    const match_status = difference < 0.05 ? 'matched' : 'mismatched';

    runInsert(`
      INSERT INTO supplier_invoices (
        id, purchase_order_id, invoice_number, invoice_date, due_date,
        subtotal, tax_amount, total_amount, match_status, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)
    `, [id, purchase_order_id, invoice_number, invoice_date, due_date, subtotal, tax_amount, total_amount, match_status, notes]);

    return { id, match_status };
  } catch (error) {
    console.error('Failed to create Supplier Invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:supplierInvoices:getByPoId', (_, poId) => {
  return runQuery('SELECT * FROM supplier_invoices WHERE purchase_order_id = ? ORDER BY invoice_date DESC', [poId]);
});

// INTELLIGENCE & REPORTS (Phase 4)
ipcMain.handle('db:reports:getLowStock', () => {
  return runQuery(`
    SELECT p.*, s.id as supplier_id, s.name as supplier_name 
    FROM products p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    WHERE p.stock_quantity <= p.min_stock_level AND p.is_active = 1
    ORDER BY s.name, p.name
  `);
});

ipcMain.handle('db:reports:getSupplierStats', () => {
  const summary = getOne(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(total) as total_purchased,
      SUM(amount_paid) as total_paid
    FROM purchase_orders
    WHERE status != 'cancelled'
  `);

  const topSuppliers = runQuery(`
    SELECT s.name, SUM(po.total) as total_spend, COUNT(po.id) as order_count
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.status != 'cancelled'
    GROUP BY s.id
    ORDER BY total_spend DESC
    LIMIT 5
  `);

  return { summary, topSuppliers };
});

// Gift Cards
ipcMain.handle('db:giftCards:getAll', () => {
  return runQuery(`
    SELECT gc.*, c.name as customer_name
    FROM gift_cards gc
    LEFT JOIN customers c ON gc.customer_id = c.id
    ORDER BY gc.created_at DESC
  `);
});

ipcMain.handle('db:giftCards:getById', (_, id) => {
  return getOne(`
    SELECT gc.*, c.name as customer_name
    FROM gift_cards gc
    LEFT JOIN customers c ON gc.customer_id = c.id
    WHERE gc.id = ?
  `, [id]);
});

ipcMain.handle('db:giftCards:getByCode', (_, code) => {
  return getOne(`
    SELECT gc.*, c.name as customer_name
    FROM gift_cards gc
    LEFT JOIN customers c ON gc.customer_id = c.id
    WHERE gc.code = ? AND gc.is_active = 1
  `, [code]);
});

ipcMain.handle('db:giftCards:create', (_, giftCard) => {
  runInsert(`
    INSERT INTO gift_cards (id, code, initial_balance, current_balance, customer_id, is_active, expires_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    giftCard.id,
    giftCard.code,
    giftCard.initial_balance,
    giftCard.current_balance || giftCard.initial_balance,
    giftCard.customer_id || null,
    giftCard.is_active ? 1 : 0,
    giftCard.expires_at || null,
    giftCard.created_by || null
  ]);
  return giftCard;
});

ipcMain.handle('db:giftCards:update', (_, giftCard) => {
  runInsert(`
    UPDATE gift_cards SET
      current_balance = ?, customer_id = ?, is_active = ?, expires_at = ?
    WHERE id = ?
  `, [
    giftCard.current_balance,
    giftCard.customer_id || null,
    giftCard.is_active ? 1 : 0,
    giftCard.expires_at || null,
    giftCard.id
  ]);
  return giftCard;
});

ipcMain.handle('db:giftCards:redeem', (_, { giftCardId, amount, saleId, employeeId }) => {
  const giftCard = getOne('SELECT * FROM gift_cards WHERE id = ?', [giftCardId]);
  if (!giftCard || !giftCard.is_active) {
    throw new Error('Gift card not found or inactive');
  }
  if (giftCard.current_balance < amount) {
    throw new Error('Insufficient balance');
  }

  const newBalance = giftCard.current_balance - amount;

  // Auto-deactivate if fully redeemed
  const isActive = newBalance > 0 ? 1 : 0;

  runInsert('UPDATE gift_cards SET current_balance = ?, is_active = ? WHERE id = ?', [newBalance, isActive, giftCardId]);

  // Log transaction
  runInsert(`
    INSERT INTO gift_card_transactions (id, gift_card_id, sale_id, amount, type, balance_before, balance_after, employee_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [uuid(), giftCardId, saleId || null, amount, 'redeem', giftCard.current_balance, newBalance, employeeId || null]);

  return { ...giftCard, current_balance: newBalance, is_active: !!isActive };
});

ipcMain.handle('db:giftCards:reload', (_, { giftCardId, amount, employeeId }) => {
  const giftCard = getOne('SELECT * FROM gift_cards WHERE id = ?', [giftCardId]);
  if (!giftCard) {
    throw new Error('Gift card not found');
  }

  const newBalance = giftCard.current_balance + amount;
  runInsert('UPDATE gift_cards SET current_balance = ?, is_active = 1 WHERE id = ?', [newBalance, giftCardId]);

  // Log transaction
  runInsert(`
    INSERT INTO gift_card_transactions (id, gift_card_id, amount, type, balance_before, balance_after, employee_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [uuid(), giftCardId, amount, 'reload', giftCard.current_balance, newBalance, employeeId || null]);

  return { ...giftCard, current_balance: newBalance, is_active: 1 };
});

ipcMain.handle('db:giftCards:getTransactions', (_, giftCardId) => {
  return runQuery(`
    SELECT gct.*, gc.code as gift_card_code, e.name as employee_name, s.receipt_number
    FROM gift_card_transactions gct
    LEFT JOIN gift_cards gc ON gct.gift_card_id = gc.id
    LEFT JOIN employees e ON gct.employee_id = e.id
    LEFT JOIN sales s ON gct.sale_id = s.id
    WHERE gct.gift_card_id = ?
    ORDER BY gct.created_at DESC
  `, [giftCardId]);
});

// Generate gift card code
ipcMain.handle('db:giftCards:generateCode', () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
});

// Bundles
ipcMain.handle('db:bundles:getAll', () => {
  return runQuery('SELECT * FROM bundles ORDER BY name');
});

ipcMain.handle('db:bundles:getById', (_, id) => {
  const bundle = getOne('SELECT * FROM bundles WHERE id = ?', [id]);
  if (bundle) {
    bundle.items = runQuery(`
      SELECT bi.*, p.name as product_name, p.price as product_price, p.image_path
      FROM bundle_items bi
      JOIN products p ON bi.product_id = p.id
      WHERE bi.bundle_id = ?
    `, [id]);
  }
  return bundle;
});

ipcMain.handle('db:bundles:getActive', () => {
  const bundles = runQuery('SELECT * FROM bundles WHERE is_active = 1 ORDER BY name');
  for (const bundle of bundles) {
    bundle.items = runQuery(`
      SELECT bi.*, p.name as product_name, p.price as product_price, p.image_path
      FROM bundle_items bi
      JOIN products p ON bi.product_id = p.id
      WHERE bi.bundle_id = ?
    `, [bundle.id]);
  }
  return bundles;
});

ipcMain.handle('db:bundles:create', (_, { bundle, items }) => {
  // Calculate original price and savings
  let originalPrice = 0;
  for (const item of items) {
    const product = getOne('SELECT price FROM products WHERE id = ?', [item.product_id]);
    if (product) {
      originalPrice += product.price * (item.quantity || 1);
    }
  }
  const savings = originalPrice - bundle.bundle_price;

  runInsert(`
    INSERT INTO bundles (id, name, description, bundle_price, original_price, savings, is_active, image_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bundle.id,
    bundle.name,
    bundle.description || null,
    bundle.bundle_price,
    originalPrice,
    savings,
    bundle.is_active ? 1 : 0,
    bundle.image_path || null
  ]);

  // Add bundle items
  for (const item of items) {
    runInsert(`
      INSERT INTO bundle_items (id, bundle_id, product_id, quantity)
      VALUES (?, ?, ?, ?)
    `, [uuid(), bundle.id, item.product_id, item.quantity || 1]);
  }

  // Bundle Assembly Logic: If pre-packed and has initial stock, deduct components
  if (bundle.deduct_component_stock === 0 && (bundle.stock_quantity || 0) > 0) {
    for (const item of items) {
      const qtyNeeded = (item.quantity || 1) * bundle.stock_quantity;

      runInsert('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [qtyNeeded, item.product_id]);

      // Log inventory movement
      runInsert(`
              INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, created_at)
              SELECT ?, ?, 'assembly', ?, stock_quantity + ?, stock_quantity, ?, CURRENT_TIMESTAMP
              FROM products WHERE id = ?
          `, [uuid(), item.product_id, -qtyNeeded, qtyNeeded, `Bundle Assembly: ${bundle.name} (+${bundle.stock_quantity})`, item.product_id]);
    }
  }

  return { ...bundle, original_price: originalPrice, savings, items };
});

ipcMain.handle('db:bundles:update', (_, { bundle, items }) => {
  // Calculate original price and savings
  let originalPrice = 0;
  for (const item of items) {
    const product = getOne('SELECT price FROM products WHERE id = ?', [item.product_id]);
    if (product) {
      originalPrice += product.price * (item.quantity || 1);
    }
  }
  const savings = originalPrice - bundle.bundle_price;

  // Fetch old bundle to check for stock changes
  const oldBundle = getOne('SELECT stock_quantity, deduct_component_stock FROM bundles WHERE id = ?', [bundle.id]);

  runInsert(`
    UPDATE bundles SET
      name = ?, description = ?, bundle_price = ?, original_price = ?, savings = ?, is_active = ?, deduct_component_stock = ?, stock_quantity = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    bundle.name,
    bundle.description || null,
    bundle.bundle_price,
    originalPrice,
    savings,
    bundle.is_active ? 1 : 0,
    bundle.deduct_component_stock ? 1 : 0,
    bundle.stock_quantity || 0,
    bundle.image_path || null,
    bundle.id
  ]);

  // Replace bundle items
  runInsert('DELETE FROM bundle_items WHERE bundle_id = ?', [bundle.id]);
  for (const item of items) {
    runInsert(`
      INSERT INTO bundle_items (id, bundle_id, product_id, quantity)
      VALUES (?, ?, ?, ?)
    `, [uuid(), bundle.id, item.product_id, item.quantity || 1]);
  }

  // Bundle Assembly Logic (Update)
  if (bundle.deduct_component_stock === 0) { // Pre-packed
    const oldStock = oldBundle ? (oldBundle.stock_quantity || 0) : 0;
    const newStock = bundle.stock_quantity || 0;
    const stockDiff = newStock - oldStock;

    if (stockDiff > 0) {
      for (const item of items) {
        const qtyNeeded = (item.quantity || 1) * stockDiff;

        runInsert('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [qtyNeeded, item.product_id]);

        // Log inventory movement
        runInsert(`
                  INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, created_at)
                  SELECT ?, ?, 'assembly', ?, stock_quantity + ?, stock_quantity, ?, CURRENT_TIMESTAMP
                  FROM products WHERE id = ?
              `, [uuid(), item.product_id, -qtyNeeded, qtyNeeded, `Bundle Assembly: ${bundle.name} (+${stockDiff})`, item.product_id]);
      }
    }
  }

  return { ...bundle, original_price: originalPrice, savings, items };
});

ipcMain.handle('db:bundles:delete', (_, id) => {
  const bundle = getOne('SELECT * FROM bundles WHERE id = ?', [id]);
  if (!bundle) return true;

  // Restore component stock if it's a pre-assembled bundle
  if (bundle.deduct_component_stock === 0 && (bundle.stock_quantity || 0) > 0) {
    const items = runQuery('SELECT * FROM bundle_items WHERE bundle_id = ?', [id]);

    for (const item of items) {
      const qtyToRestore = (item.quantity || 1) * bundle.stock_quantity;

      runInsert('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [qtyToRestore, item.product_id]);

      runInsert(`
        INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, created_at)
        SELECT ?, ?, 'disassembly', ?, stock_quantity - ?, stock_quantity, ?, CURRENT_TIMESTAMP
        FROM products WHERE id = ?
      `, [uuid(), item.product_id, qtyToRestore, qtyToRestore, `Bundle Deleted: ${bundle.name}`, item.product_id]);
    }
  }

  runInsert('DELETE FROM bundles WHERE id = ?', [id]);
  return true;
});

ipcMain.handle('db:bundles:assemble', (_, { id, quantity }) => {
  const bundle = getOne('SELECT * FROM bundles WHERE id = ?', [id]);
  if (!bundle) throw new Error('Bundle not found');

  const items = runQuery('SELECT * FROM bundle_items WHERE bundle_id = ?', [id]);
  if (items.length === 0) throw new Error('Bundle has no items');

  // Check valid quantity
  if (quantity <= 0) throw new Error('Invalid quantity');

  // Verify component stock
  for (const item of items) {
    const product = getOne('SELECT stock_quantity, name FROM products WHERE id = ?', [item.product_id]);
    const required = (item.quantity || 1) * quantity;
    if (product.stock_quantity < required) {
      throw new Error(`Insufficient stock for ${product.name}. Need ${required}, have ${product.stock_quantity}`);
    }
  }

  // Deduct components and Log
  for (const item of items) {
    const required = (item.quantity || 1) * quantity;

    runInsert('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [required, item.product_id]);

    runInsert(`
      INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, created_at)
      SELECT ?, ?, 'assembly', ?, stock_quantity + ?, stock_quantity, ?, CURRENT_TIMESTAMP
      FROM products WHERE id = ?
    `, [uuid(), item.product_id, -required, required, `Bundle Assembly: ${bundle.name} (+${quantity})`, item.product_id]);
  }

  // Increase Bundle Stock
  runInsert('UPDATE bundles SET stock_quantity = COALESCE(stock_quantity, 0) + ? WHERE id = ?', [quantity, id]);

  return true;
});

ipcMain.handle('db:bundles:disassemble', (_, { id, quantity }) => {
  const bundle = getOne('SELECT * FROM bundles WHERE id = ?', [id]);
  if (!bundle) throw new Error('Bundle not found');

  const currentStock = bundle.stock_quantity || 0;
  if (currentStock < quantity) {
    throw new Error(`Insufficient bundle stock to disassemble. Have: ${currentStock}, Need: ${quantity}`);
  }

  const items = runQuery('SELECT * FROM bundle_items WHERE bundle_id = ?', [id]);

  // Decrease Bundle Stock
  runInsert('UPDATE bundles SET stock_quantity = COALESCE(stock_quantity, 0) - ? WHERE id = ?', [quantity, id]);

  // Restore Components
  for (const item of items) {
    const toRestore = (item.quantity || 1) * quantity;

    runInsert('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [toRestore, item.product_id]);

    runInsert(`
      INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, created_at)
      SELECT ?, ?, 'disassembly', ?, stock_quantity - ?, stock_quantity, ?, CURRENT_TIMESTAMP
      FROM products WHERE id = ?
    `, [uuid(), item.product_id, toRestore, toRestore, `Bundle Disassembly: ${bundle.name} (-${quantity})`, item.product_id]);
  }

  return true;
});

// Promotions
ipcMain.handle('db:promotions:getAll', () => {
  return runQuery('SELECT * FROM promotions ORDER BY created_at DESC');
});

ipcMain.handle('db:promotions:getActive', () => {
  const now = new Date().toISOString();
  return runQuery(`
    SELECT * FROM promotions
    WHERE is_active = 1
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
      AND (max_uses IS NULL OR current_uses < max_uses)
    ORDER BY created_at DESC
  `, [now, now]);
});

ipcMain.handle('db:promotions:getById', (_, id) => {
  return getOne('SELECT * FROM promotions WHERE id = ?', [id]);
});

ipcMain.handle('db:promotions:getByCode', (_, code) => {
  const now = new Date().toISOString();
  return getOne(`
    SELECT * FROM promotions
    WHERE coupon_code = ?
      AND is_active = 1
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
      AND (max_uses IS NULL OR current_uses < max_uses)
  `, [code, now, now]);
});

ipcMain.handle('db:promotions:create', (_, promo) => {
  runInsert(`
    INSERT INTO promotions (id, name, description, type, value, min_purchase, max_discount, max_uses, start_date, end_date, is_active, applies_to, applies_to_ids, coupon_code, auto_apply)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    promo.id,
    promo.name,
    promo.description || null,
    promo.type,
    promo.value || 0,
    promo.min_purchase || 0,
    promo.max_discount || null,
    promo.max_uses || null,
    promo.start_date || null,
    promo.end_date || null,
    promo.is_active ? 1 : 0,
    promo.applies_to || 'all',
    promo.applies_to_ids ? JSON.stringify(promo.applies_to_ids) : null,
    promo.coupon_code || null,
    promo.auto_apply ? 1 : 0
  ]);
  return promo;
});

ipcMain.handle('db:promotions:update', (_, promo) => {
  runInsert(`
    UPDATE promotions SET
      name = ?, description = ?, type = ?, value = ?, min_purchase = ?, max_discount = ?,
      max_uses = ?, start_date = ?, end_date = ?, is_active = ?, applies_to = ?,
      applies_to_ids = ?, coupon_code = ?, auto_apply = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    promo.name,
    promo.description || null,
    promo.type,
    promo.value || 0,
    promo.min_purchase || 0,
    promo.max_discount || null,
    promo.max_uses || null,
    promo.start_date || null,
    promo.end_date || null,
    promo.is_active ? 1 : 0,
    promo.applies_to || 'all',
    promo.applies_to_ids ? JSON.stringify(promo.applies_to_ids) : null,
    promo.coupon_code || null,
    promo.auto_apply ? 1 : 0,
    promo.id
  ]);
  return promo;
});

ipcMain.handle('db:promotions:delete', (_, id) => {
  runInsert('DELETE FROM promotions WHERE id = ?', [id]);
  return true;
});

ipcMain.handle('db:promotions:incrementUse', (_, id) => {
  runInsert('UPDATE promotions SET current_uses = current_uses + 1 WHERE id = ?', [id]);
  return true;
});

// Receipts tracking
ipcMain.handle('db:receipts:create', (_, receipt) => {
  runInsert(`
    INSERT INTO receipts (id, sale_id, type, email_to, status)
    VALUES (?, ?, ?, ?, ?)
  `, [receipt.id, receipt.sale_id, receipt.type, receipt.email_to || null, receipt.status || 'pending']);
  return receipt;
});

ipcMain.handle('db:receipts:updateStatus', (_, { id, status, errorMessage }) => {
  if (status === 'sent') {
    runInsert('UPDATE receipts SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
  } else {
    runInsert('UPDATE receipts SET status = ?, error_message = ? WHERE id = ?', [status, errorMessage || null, id]);
  }
  return true;
});

ipcMain.handle('db:receipts:getBySale', (_, saleId) => {
  return runQuery('SELECT * FROM receipts WHERE sale_id = ? ORDER BY created_at DESC', [saleId]);
});

// Helper for fetching settings
async function fetchSettings() {
  const rows = runQuery('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach(row => {
    try { settings[row.key] = JSON.parse(row.value); }
    catch (e) { settings[row.key] = row.value; }
  });
  if (settings.store_config) {
    Object.assign(settings, settings.store_config);
  }
  return settings;
}

ipcMain.handle('receipts:print', async (_, sale) => {
  try {
    const settings = await fetchSettings();
    return await receiptService.print(sale, settings);
  } catch (error) {
    console.error('Print error:', error);
    throw error;
  }
});

ipcMain.handle('receipts:getHtml', async (_, sale) => {
  try {
    const settings = await fetchSettings();
    return receiptService.getHtml(sale, settings);
  } catch (error) {
    console.error('getHtml error:', error);
    throw error;
  }
});

ipcMain.handle('receipts:savePdf', async (_, sale) => {
  try {
    const settings = await fetchSettings();
    const dialogResult = await dialog.showSaveDialog({
      title: 'Save Receipt PDF',
      defaultPath: `Receipt_${sale.receipt_number || 'doc'}.pdf`,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (dialogResult.canceled) return null;
    return await receiptService.generatePdf(sale, settings, dialogResult.filePath);
  } catch (error) {
    console.error('savePdf error:', error);
    throw error;
  }
});

// ===== BARCODE SERVICE =====
const barcodeService = require('./services/barcodeService');

ipcMain.handle('barcode:getTypes', () => {
  return barcodeService.getBarcodeTypes();
});

ipcMain.handle('barcode:getPresets', () => {
  return barcodeService.getIndustryPresets();
});

ipcMain.handle('barcode:generate', async (_, options) => {
  return await barcodeService.generateBarcode(options);
});

ipcMain.handle('barcode:generateLabel', async (_, options) => {
  return await barcodeService.generateLabel(options);
});

ipcMain.handle('barcode:generateBatch', async (_, { products, preset, quantity }) => {
  return await barcodeService.generateBatchLabels(products, preset, quantity);
});

ipcMain.handle('barcode:generateGS1', (_, components) => {
  return barcodeService.generateGS1Data(components);
});

ipcMain.handle('barcode:generateRandom', (_, type) => {
  return barcodeService.generateRandomBarcode(type);
});

ipcMain.handle('barcode:calculateCheckDigit', (_, { data, type }) => {
  return barcodeService.calculateCheckDigit(data, type);
});

// ===== EXCEL SERVICE =====
const excelService = require('./services/excelService');

ipcMain.handle('excel:parseBuffer', (_, buffer) => {
  // Convert array to Buffer if needed
  const buf = Buffer.from(buffer);
  return excelService.parseBuffer(buf);
});

ipcMain.handle('excel:detectMappings', (_, { headers, dataType }) => {
  return excelService.detectColumnMappings(headers, dataType);
});

ipcMain.handle('excel:validateAndTransform', (_, { rows, mappings, dataType }) => {
  return excelService.validateAndTransform(rows, mappings, dataType);
});

ipcMain.handle('excel:getFieldMappings', (_, dataType) => {
  return excelService.getFieldMappings(dataType);
});

ipcMain.handle('excel:generateTemplate', (_, dataType) => {
  const buffer = excelService.generateTemplate(dataType);
  return Array.from(buffer);
});




ipcMain.handle('quotations:print', async (_, quote) => {
  // Print using the same service, it will auto-detect type 'quotation' via the update above
  return await receiptService.print(quote);
});

ipcMain.handle('quotations:savePdf', async (_, quote) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Quotation',
    defaultPath: `Quotation_${quote.quote_number}.pdf`,
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) return null;

  const settings = await getSettings(); // Helper or duplicate logic
  await receiptService.generateQuotationPdf(quote, settings, filePath);
  return filePath;
});



// Helper to get settings object
async function getSettings() {
  const rows = runQuery('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach(row => {
    try { settings[row.key] = JSON.parse(row.value); }
    catch (e) { settings[row.key] = row.value; }
  });
  return settings;
}

ipcMain.handle('excel:export', (_, { data, dataType }) => {
  const buffer = excelService.exportData(data, dataType);
  return Array.from(buffer);
});


// ================================================
// QUOTATIONS
// ================================================
ipcMain.handle('db:quotations:create', (_, quote) => {
  runInsert(`
    INSERT INTO quotations (id, quote_number, customer_id, subtotal, tax_amount, discount_amount, total, notes, status, valid_until, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    quote.id,
    quote.quote_number,
    quote.customer_id || null,
    quote.subtotal || 0,
    quote.tax_amount || 0,
    quote.discount_amount || 0,
    quote.total || 0,
    quote.notes || null,
    quote.status || 'active',
    quote.valid_until || null,
    quote.created_by || null
  ]);

  for (const item of quote.items) {
    runInsert(`
      INSERT INTO quotation_items (id, quotation_id, product_id, product_name, quantity, unit_price, discount, tax_amount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uuid(),
      quote.id,
      item.product_id || null,
      item.product_name,
      item.quantity,
      item.unit_price || 0,
      item.discount || 0,
      item.tax_amount || 0,
      item.total || 0
    ]);
  }
  return quote;
});

ipcMain.handle('db:quotations:getAll', () => {
  return runQuery(`
    SELECT q.*, c.name as customer_name, e.name as employee_name
    FROM quotations q
    LEFT JOIN customers c ON q.customer_id = c.id
    LEFT JOIN employees e ON q.created_by = e.id
    ORDER BY q.created_at DESC
    `);
});

ipcMain.handle('db:quotations:getById', (_, id) => {
  const quote = getOne(`
    SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, e.name as employee_name
    FROM quotations q
    LEFT JOIN customers c ON q.customer_id = c.id
    LEFT JOIN employees e ON q.created_by = e.id
    WHERE q.id = ?
    `, [id]);

  if (quote) {
    quote.items = runQuery('SELECT * FROM quotation_items WHERE quotation_id = ?', [id]);
  }
  return quote;
});

// ================================================
// RETURNS
// ================================================


ipcMain.handle('db:purchaseOrders:receiveStock', (_, { poId, receivedItems }) => {
  // 1. Update PO status
  runInsert("UPDATE purchase_orders SET status = 'received', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [poId]);

  // 2. Update Product Stock and Log
  const items = runQuery('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [poId]);

  for (const item of items) {
    if (item.product_id) {
      const product = getOne('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
      const currentStock = product ? product.stock_quantity : 0;
      const newStock = currentStock + item.quantity;

      runInsert('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, item.product_id]);

      runInsert(
        'INSERT INTO inventory_logs (id, product_id, type, quantity_change, quantity_before, quantity_after, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [uuid(), item.product_id, 'receive_po', item.quantity, currentStock, newStock, `Received PO #${poId}`]
      );
    }
  }
  return true;
});

// ==========================================
// CREDIT SALES HANDLERS
// ==========================================

console.log('Registering credit sales IPC handlers...');

// Generate invoice number
function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  // Get count of invoices today
  const todayStart = `${date.getFullYear()}-${month}-${day}`;
  const result = getOne(`SELECT COUNT(*) as count FROM credit_sales WHERE created_at >= ?`, [todayStart]);
  const count = (result?.count || 0) + 1;

  return `INV-${year}${month}${day}-${count.toString().padStart(4, '0')}`;
}

console.log('About to register db:creditSales:getAll handler...');

ipcMain.handle('db:creditSales:getAll', (_, params = {}) => {
  let query = `
    SELECT cs.*, s.receipt_number, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
    FROM credit_sales cs
    LEFT JOIN sales s ON cs.sale_id = s.id
    LEFT JOIN customers c ON cs.customer_id = c.id
  `;

  const conditions = [];
  const values = [];

  if (params.customerId) {
    conditions.push('cs.customer_id = ?');
    values.push(params.customerId);
  }

  if (params.status) {
    conditions.push('cs.status = ?');
    values.push(params.status);
  }

  if (params.startDate) {
    conditions.push('cs.created_at >= ?');
    values.push(params.startDate);
  }

  if (params.endDate) {
    conditions.push('cs.created_at <= ?');
    values.push(params.endDate);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY cs.created_at DESC';

  return runQuery(query, values);
});

ipcMain.handle('db:creditSales:getById', (_, id) => {
  const creditSale = getOne(`
    SELECT cs.*, s.receipt_number, s.subtotal, s.tax_amount, s.discount_amount,
           c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address
    FROM credit_sales cs
    LEFT JOIN sales s ON cs.sale_id = s.id
    LEFT JOIN customers c ON cs.customer_id = c.id
    WHERE cs.id = ?
  `, [id]);

  if (creditSale) {
    // Get sale items
    creditSale.items = runQuery('SELECT * FROM sale_items WHERE sale_id = ?', [creditSale.sale_id]);
    // Get payments made
    creditSale.payments = runQuery(`
      SELECT cp.*, e.name as received_by_name
      FROM credit_payments cp
      LEFT JOIN employees e ON cp.received_by = e.id
      WHERE cp.credit_sale_id = ?
      ORDER BY cp.created_at DESC
    `, [id]);
  }

  return creditSale;
});

ipcMain.handle('db:creditSales:getByCustomer', (_, customerId) => {
  return runQuery(`
    SELECT cs.*, s.receipt_number
    FROM credit_sales cs
    LEFT JOIN sales s ON cs.sale_id = s.id
    WHERE cs.customer_id = ?
    ORDER BY cs.created_at DESC
  `, [customerId]);
});

ipcMain.handle('db:creditSales:create', (_, creditSale) => {
  const invoiceNumber = creditSale.invoice_number || generateInvoiceNumber();
  const id = creditSale.id || uuid();

  // Calculate due date (30 days from now by default)
  const dueDate = creditSale.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  runInsert(`
    INSERT INTO credit_sales (id, sale_id, customer_id, invoice_number, amount_due, amount_paid, status, due_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    creditSale.sale_id,
    creditSale.customer_id,
    invoiceNumber,
    creditSale.amount_due,
    creditSale.amount_paid || 0,
    creditSale.status || 'pending',
    dueDate,
    creditSale.notes || null
  ]);

  // Update customer credit_balance
  runInsert(`
    UPDATE customers 
    SET credit_balance = credit_balance + ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [creditSale.amount_due, creditSale.customer_id]);

  return { ...creditSale, id, invoice_number: invoiceNumber, due_date: dueDate };
});

ipcMain.handle('db:creditSales:update', (_, creditSale) => {
  runInsert(`
    UPDATE credit_sales 
    SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [creditSale.status, creditSale.notes || null, creditSale.id]);

  return creditSale;
});

// Credit Payments
ipcMain.handle('db:creditPayments:create', (_, payment) => {
  const id = payment.id || uuid();

  // Get the credit sale
  const creditSale = getOne('SELECT * FROM credit_sales WHERE id = ?', [payment.credit_sale_id]);
  if (!creditSale) {
    throw new Error('Credit sale not found');
  }

  // Record the payment
  runInsert(`
    INSERT INTO credit_payments (id, credit_sale_id, amount, payment_method, reference, received_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    payment.credit_sale_id,
    payment.amount,
    payment.payment_method,
    payment.reference || null,
    payment.received_by || null,
    payment.notes || null
  ]);

  // Update credit sale
  const newAmountPaid = (creditSale.amount_paid || 0) + payment.amount;
  let newStatus = 'partial';

  // Fix for floating point precision issues
  // Compare rounded values (cents)
  const paidCents = Math.round(newAmountPaid * 100);
  const dueCents = Math.round(creditSale.amount_due * 100);

  if (paidCents >= dueCents) {
    newStatus = 'paid';
  }

  runInsert(`
    UPDATE credit_sales 
    SET amount_paid = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newAmountPaid, newStatus, payment.credit_sale_id]);

  // Update customer credit_balance
  runInsert(`
    UPDATE customers 
    SET credit_balance = credit_balance - ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [payment.amount, creditSale.customer_id]);

  return { ...payment, id };
});

ipcMain.handle('db:creditPayments:getByCreditSale', (_, creditSaleId) => {
  return runQuery(`
    SELECT cp.*, e.name as received_by_name
    FROM credit_payments cp
    LEFT JOIN employees e ON cp.received_by = e.id
    WHERE cp.credit_sale_id = ?
    ORDER BY cp.created_at DESC
  `, [creditSaleId]);
});

ipcMain.handle('db:creditPayments:getById', (_, paymentId) => {
  return getOne(`
      SELECT cp.*, cs.invoice_number, c.name as customer_name,
             (cs.amount_due - cs.amount_paid) as remaining_balance
      FROM credit_payments cp
      JOIN credit_sales cs ON cp.credit_sale_id = cs.id
      JOIN customers c ON cs.customer_id = c.id
      WHERE cp.id = ?
    `, [paymentId]);
});

ipcMain.handle('creditPayments:printReceipt', async (_, paymentId) => {
  const payment = getOne(`
    SELECT cp.*, cs.invoice_number, c.name as customer_name,
           (cs.amount_due - cs.amount_paid) as remaining_balance
    FROM credit_payments cp
    JOIN credit_sales cs ON cp.credit_sale_id = cs.id
    JOIN customers c ON cs.customer_id = c.id
    WHERE cp.id = ?
  `, [paymentId]);

  if (!payment) {
    throw new Error('Payment not found');
  }

  const settings = await getSettings();
  return await receiptService.print(payment, { ...settings, type: 'credit_payment' });
});

// Customer Credit Info
ipcMain.handle('db:customers:getCreditInfo', (_, customerId) => {
  const customer = getOne(`
    SELECT id, name, email, phone, credit_enabled, credit_limit, credit_balance
    FROM customers WHERE id = ?
  `, [customerId]);

  if (customer) {
    customer.available_credit = (customer.credit_limit || 0) - (customer.credit_balance || 0);
    customer.pending_sales = runQuery(`
      SELECT COUNT(*) as count, SUM(amount_due - amount_paid) as total_pending
      FROM credit_sales
      WHERE customer_id = ? AND status IN ('pending', 'partial')
    `, [customerId])[0] || { count: 0, total_pending: 0 };
  }

  return customer;
});

ipcMain.handle('db:customers:updateCreditSettings', (_, { customerId, credit_enabled, credit_limit }) => {
  runInsert(`
    UPDATE customers 
    SET credit_enabled = ?, credit_limit = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [credit_enabled ? 1 : 0, credit_limit || 0, customerId]);

  return true;
});

// Generate invoice number handler
ipcMain.handle('db:creditSales:generateInvoiceNumber', () => {
  return generateInvoiceNumber();
});

// Credit Invoice Email
ipcMain.handle('creditInvoice:sendEmail', async (_, { creditSaleId, email }) => {
  const creditSale = getOne(`
    SELECT cs.*, s.receipt_number, s.subtotal, s.tax_amount, s.discount_amount,
           c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address
    FROM credit_sales cs
    LEFT JOIN sales s ON cs.sale_id = s.id
    LEFT JOIN customers c ON cs.customer_id = c.id
    WHERE cs.id = ?
  `, [creditSaleId]);

  if (!creditSale) {
    throw new Error('Credit sale not found');
  }

  console.log('Sending Credit Invoice Email. Data:', JSON.stringify(creditSale, null, 2));

  creditSale.items = runQuery('SELECT * FROM sale_items WHERE sale_id = ?', [creditSale.sale_id]);
  creditSale.payments = runQuery('SELECT * FROM credit_payments WHERE credit_sale_id = ?', [creditSaleId]);

  // Get settings
  const rows = runQuery('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach(row => {
    try { settings[row.key] = JSON.parse(row.value); }
    catch (e) { settings[row.key] = row.value; }
  });

  // Initialize email service
  if (!initEmailService({
    smtp_host: settings.email_host,
    smtp_port: settings.email_port,
    smtp_user: settings.email_user,
    smtp_pass: settings.email_password,
    smtp_secure: settings.email_secure
  })) {
    throw new Error('Email service not configured');
  }

  // Generate invoice PDF
  const invoiceService = require('./services/invoiceService');
  const pdfPath = await invoiceService.generateInvoicePdf(creditSale, settings);

  try {
    const result = await invoiceService.sendInvoiceEmail({
      to: email || creditSale.customer_email,
      creditSale,
      businessInfo: {
        businessName: settings.businessName || 'POS',
        businessAddress: settings.businessAddress,
        businessPhone: settings.businessPhone,
        businessEmail: settings.businessEmail
      },
      pdfPath
    });

    // Cleanup
    fs.unlink(pdfPath, () => { });

    return result;
  } catch (error) {
    fs.unlink(pdfPath, () => { });
    throw error;
  }
});

// Send payment reminder
ipcMain.handle('creditInvoice:sendReminder', async (_, { creditSaleId, email }) => {
  const creditSale = getOne(`
    SELECT cs.*, c.name as customer_name, c.email as customer_email
    FROM credit_sales cs
    LEFT JOIN customers c ON cs.customer_id = c.id
    WHERE cs.id = ?
  `, [creditSaleId]);

  if (!creditSale) {
    throw new Error('Credit sale not found');
  }

  const settings = await getSettings();

  if (!initEmailService({
    smtp_host: settings.email_host,
    smtp_port: settings.email_port,
    smtp_user: settings.email_user,
    smtp_pass: settings.email_password,
    smtp_secure: settings.email_secure
  })) {
    throw new Error('Email service not configured');
  }

  const invoiceService = require('./services/invoiceService');
  return await invoiceService.sendReminderEmail({
    to: email || creditSale.customer_email,
    creditSale,
    businessInfo: {
      businessName: settings.businessName || 'POS',
      businessPhone: settings.businessPhone,
      businessEmail: settings.businessEmail
    }
  });
});

console.log('Electron main process started (Phase 5 - Credit Sales enabled)');


// Gift Card PDF & Emailhandlers
ipcMain.handle('giftCards:savePdf', async (_, giftCard) => {
  try {
    const dialogResult = await dialog.showSaveDialog({
      title: 'Save Gift Card PDF',
      defaultPath: `GiftCard_${giftCard.code}.pdf`,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (dialogResult.canceled) return null;

    const receiptService = new ReceiptService();
    const settings = getOne("SELECT value FROM settings WHERE key = 'store_config'") || {};
    let storeSettings = {};
    try { storeSettings = JSON.parse(settings.value); } catch (e) { }

    const pdfPath = await receiptService.generateGiftCardPdf(giftCard, storeSettings, dialogResult.filePath);
    return pdfPath;
  } catch (error) {
    console.error('Failed to save Gift Card PDF:', error);
    throw error;
  }
});

ipcMain.handle('email:sendGiftCard', async (_, { giftCard, email }) => {
  try {
    const receiptService = new ReceiptService();

    // Get all settings (Same approach as creditInvoice:sendEmail for consistency)
    const rows = runQuery('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(row => {
      try { settings[row.key] = JSON.parse(row.value); }
      catch (e) { settings[row.key] = row.value; }
    });

    // Merge structured settings if they exist (compatibility with new SettingsPage structure)
    // Structure from SettingsPage: { host, port, user, pass, secure }
    if (settings.email_settings) {
      settings.email_host = settings.email_settings.host || settings.email_host;
      settings.email_port = settings.email_settings.port || settings.email_port;
      settings.email_user = settings.email_settings.user || settings.email_user;
      settings.email_password = settings.email_settings.pass || settings.email_password;
      settings.email_secure = settings.email_settings.secure !== undefined ? settings.email_settings.secure : settings.email_secure;
    }

    // Structure from SettingsPage: { businessName, etc }
    if (settings.store_config) {
      Object.assign(settings, settings.store_config);
    }

    // Generate PDF to temp path
    const pdfPath = await receiptService.generateGiftCardPdf(giftCard, settings);

    // Init service
    // Using require here to ensure access if global scope is ambiguous
    const emailService = require('./services/emailService');

    const emailConfig = {
      smtp_host: settings.email_host,
      smtp_port: settings.email_port,
      smtp_user: settings.email_user,
      smtp_pass: settings.email_password,
      smtp_secure: settings.email_secure
    };

    if (emailService.initEmailService(emailConfig)) {
      await emailService.sendEmail({
        to: email,
        subject: `Your Gift Card from ${settings.businessName || 'POS System'}`,
        html: `
                <h2>Here is your Gift Card!</h2>
                <p>Enjoy your gift card of <strong>${receiptService.formatCurrency(giftCard.current_balance)}</strong>.</p>
                <p>Please find the printable card attached.</p>
                <br>
                <p>Thank you!</p>
            `,
        attachments: [{
          filename: `GiftCard_${giftCard.code}.pdf`,
          path: pdfPath
        }]
      });
      return true;
    } else {
      throw new Error("Failed to initialize email service");
    }

  } catch (error) {
    console.error('Failed to send Gift Card Email:', error);
    throw error;
  }
});
