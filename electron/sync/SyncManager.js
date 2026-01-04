const { getDatabase, runQuery, runInsert, getTableColumns } = require('../database/init');
const { app, ipcMain } = require('electron');

class SyncManager {
    constructor() {
        this.mainWindow = null;
        this.queue = [];
        this.isSyncing = false;
        this.syncInterval = null;
    }

    async init() {
        console.log('SyncManager: Initialized (Realtime Mode)');

        // Load sync interval from settings
        try {
            const settings = getDatabase().exec("SELECT value FROM settings WHERE key = 'sync_settings'");
            if (settings.length > 0) {
                try {
                    const config = JSON.parse(settings[0].values[0][0]);
                    if (config.interval) {
                        this.startAutoSync(parseInt(config.interval));
                    }
                } catch (e) {
                    console.log('[SyncManager] Failed to parse sync settings', e);
                }
            }
        } catch (e) {
            console.log('[SyncManager] No sync config found, defaulting to manual/hook triggers');
        }
    }

    // Called by electron/main.js
    setWindow(window) {
        this.mainWindow = window;
    }

    startAutoSync(minutes) {
        this.stopAutoSync();
        if (!minutes || minutes <= 0) return;

        console.log(`[SyncManager] Starting auto-sync every ${minutes} minutes`);
        this.syncInterval = setInterval(() => {
            console.log('[SyncManager] Auto-sync trigger');
            this.pushLocalChanges();
        }, minutes * 60 * 1000);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async updateConfig(config) {
        if (config.interval !== undefined) {
            this.startAutoSync(parseInt(config.interval));
        }
    }

    // Triggered by DB hooks (create/update)
    triggerSync() {
        // DISABLED: Causes infinite loop when SyncManager ACKs trigger more syncs
        console.log('[SyncManager] triggerSync called but DISABLED');
        return;
        // In Realtime mode, we just push pending changes immediately
        // this.pushLocalChanges();
    }

    // 1. OUTBOUND: Local -> Renderer -> Firebase
    async pushLocalChanges() {
        if (!this.mainWindow || this.isSyncing) return;

        this.isSyncing = true;
        this.broadcastStatus('syncing');

        const tables = [
            'products', 'customers', 'sales', 'employees', 'inventory_logs',
            'gift_cards', 'bundles', 'promotions',
            'categories', 'suppliers', 'purchase_orders', 'receivings', 'supplier_invoices',
            'sale_items', 'purchase_order_items', 'receiving_items',
            'credit_sales', 'credit_payments',
            'quotations', 'quotation_items',
            'returns', 'return_items', 'supplier_payments'
        ];
        const db = getDatabase();
        let changeCount = 0;

        for (const table of tables) {
            try {
                // Find unsynced records
                const result = db.exec(`SELECT * FROM ${table} WHERE is_synced = 0`);
                if (result.length > 0) {
                    const columns = result[0].columns;
                    const rows = result[0].values;

                    for (const rowVal of rows) {
                        const row = {};
                        columns.forEach((col, i) => row[col] = rowVal[i]);

                        console.log(`[SyncManager] Outbound Request: ${table}/${row.id}`);

                        // Send to Renderer
                        this.mainWindow.webContents.send('sync:outbound', { table, record: row });
                        changeCount++;
                    }
                }
            } catch (e) {
                console.error(`[SyncManager] Outbound error ${table}:`, e);
            }
        }

        // Wait a small moment to let UI show 'syncing'
        setTimeout(() => {
            this.isSyncing = false;
            this.broadcastStatus('idle', { lastSync: Date.now() });
        }, 1000);
    }

    // 2. INBOUND: Firebase -> Renderer -> Main -> SQLite
    async handleIncoming({ table, record }) {
        this.broadcastStatus('syncing', { message: 'Receiving data...' });
        console.log(`[SyncManager] Incoming ${table}: ${record.id}`);

        try {
            // Get valid columns for this table
            const tableColumns = getTableColumns(table);
            if (!tableColumns || tableColumns.length === 0) {
                console.error(`[SyncManager] Unknown table or no columns: ${table}`);
                return;
            }

            // Filter record to only include valid columns
            const cleanRecord = {};
            Object.keys(record).forEach(key => {
                if (tableColumns.includes(key)) {
                    cleanRecord[key] = record[key];
                }
            });

            // Ensure is_synced is set to 1 (true) since this comes from cloud
            cleanRecord.is_synced = 1;

            // If remote_id is missing but we have an id (which is the remote doc id effectively), set it
            if (tableColumns.includes('remote_id') && !cleanRecord.remote_id) {
                cleanRecord.remote_id = cleanRecord.id;
            }

            // Check if exists (by ID first)
            let existing = runQuery(`SELECT id FROM ${table} WHERE id = ?`, [cleanRecord.id]);

            // SMART DEDUPLICATION: If ID not found, check other unique fields to prevent duplicates
            if (existing.length === 0) {
                if (table === 'employees' && cleanRecord.email) {
                    existing = runQuery(`SELECT id FROM employees WHERE email = ?`, [cleanRecord.email]);
                } else if (table === 'customers' && (cleanRecord.email || cleanRecord.phone)) {
                    existing = runQuery(`SELECT id FROM customers WHERE email = ? OR phone = ?`, [cleanRecord.email, cleanRecord.phone]);
                } else if (table === 'products' && (cleanRecord.sku || cleanRecord.barcode)) {
                    existing = runQuery(`SELECT id FROM products WHERE sku = ? OR barcode = ?`, [cleanRecord.sku, cleanRecord.barcode]);
                } else if (table === 'categories' && cleanRecord.name) {
                    existing = runQuery(`SELECT id FROM categories WHERE name = ?`, [cleanRecord.name]);
                }

                // If found by smart lookup, use that local ID to update instead of inserting a new row
                if (existing.length > 0) {
                    cleanRecord.id = existing[0].id; // Overtake the local ID
                    // Note: We are now updating the local record with the cloud record's ID? 
                    // NO. If we found a local match, we should probably update the local record 
                    // BUT keep the local ID? Or switch to Cloud ID?
                    // Switching ID is dangerous for foreign keys.
                    // BETTER STRATEGY: Update the local record, set remote_id = cloud_id.
                    console.log(`[SyncManager] Smart Dedupe: Found local match for ${table}/${cleanRecord.id} -> Local ID ${existing[0].id}`);

                    // We must NOT change the local ID if other tables reference it. 
                    // So we map: cleanRecord (which has cloud ID) -> Local ID.
                    // But `cleanRecord` is what we use for SQL generation.
                    // So we must swap the ID in `cleanRecord` to the local one.

                    // Store the cloud ID as remote_id
                    cleanRecord.remote_id = record.id;
                    // Use the local ID for the UPDATE operation
                    cleanRecord.id = existing[0].id;
                }
            }

            if (existing.length === 0) {
                // INSERT
                const keys = Object.keys(cleanRecord);
                const placeholders = keys.map(() => '?').join(',');
                const values = keys.map(k => cleanRecord[k]);

                const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
                if (runInsert(sql, values)) {
                    console.log(`[SyncManager] Inserted ${table}/${cleanRecord.id}`);
                }
            } else {
                // CONFLICT RESOLUTION: Check if local record has pending changes
                const localRecord = runQuery(`SELECT is_synced, updated_at FROM ${table} WHERE id = ?`, [cleanRecord.id]);
                if (localRecord.length > 0 && localRecord[0].is_synced === 0) {
                    // Local has pending changes - DO NOT overwrite with cloud data
                    // Local changes will be pushed to cloud in next outbound sync
                    console.log(`[SyncManager] CONFLICT: Skipping incoming update for ${table}/${cleanRecord.id} (local has pending changes)`);
                    return; // Exit without updating
                }

                // UPDATE - Safe to apply incoming data
                const keys = Object.keys(cleanRecord).filter(k => k !== 'id');
                const setClause = keys.map(k => `${k} = ?`).join(',');
                const values = keys.map(k => cleanRecord[k]);
                values.push(cleanRecord.id); // Add ID for WHERE clause

                const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
                if (runInsert(sql, values)) {
                    console.log(`[SyncManager] Updated ${table}/${cleanRecord.id}`);
                }
            }

            this.broadcastStatus('idle');

        } catch (e) {
            console.error('[SyncManager] Inbound error:', e);
            this.broadcastStatus('error', { error: e.message });
        }
    }

    // 3. ACK: Renderer confirms cloud write
    async handleAck({ table, localId, remoteId }) {
        console.log(`[SyncManager] ACK ${table}: ${localId}`);
        runInsert(`UPDATE ${table} SET is_synced = 1, remote_id = ? WHERE id = ?`, [remoteId, localId]);
        // Typically we stay 'syncing' until queue cleared, but for now simple broadcast
        this.broadcastStatus('idle');
    }

    broadcastStatus(status, details = null) {
        if (this.mainWindow && this.mainWindow.webContents) {
            this.mainWindow.webContents.send('sync:status-changed', { status, details, timestamp: Date.now() });
        }
    }
}

module.exports = new SyncManager();
