-- E-commerce Integration Schema
-- Two-way inventory sync with Shopify, WooCommerce, and Etsy

-- E-commerce platform connections
CREATE TABLE IF NOT EXISTS ecommerce_connections (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL, -- 'shopify', 'woocommerce', 'etsy'
    store_name TEXT,
    store_url TEXT NOT NULL,
    api_key TEXT,
    api_secret TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    shop_id TEXT, -- Etsy shop ID
    location_id TEXT, -- Shopify inventory location ID
    is_active INTEGER DEFAULT 1,
    sync_enabled INTEGER DEFAULT 1,
    sync_interval_minutes INTEGER DEFAULT 15,
    last_sync_at DATETIME,
    last_sync_status TEXT, -- 'success', 'error', 'partial'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product mappings between local and remote platforms
CREATE TABLE IF NOT EXISTS ecommerce_product_mappings (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    connection_id TEXT REFERENCES ecommerce_connections(id) ON DELETE CASCADE,
    remote_product_id TEXT NOT NULL,
    remote_variant_id TEXT, -- Shopify variant ID, WooCommerce variation ID
    remote_sku TEXT,
    remote_inventory_item_id TEXT, -- Shopify inventory item ID
    last_local_quantity INTEGER,
    last_remote_quantity INTEGER,
    last_synced_at DATETIME,
    sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending_push', 'pending_pull', 'error', 'conflict'
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, connection_id)
);

-- Sync operation logs
CREATE TABLE IF NOT EXISTS ecommerce_sync_logs (
    id TEXT PRIMARY KEY,
    connection_id TEXT REFERENCES ecommerce_connections(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL, -- 'push', 'pull', 'full', 'webhook'
    trigger_type TEXT DEFAULT 'manual', -- 'manual', 'scheduled', 'webhook', 'stock_change'
    status TEXT NOT NULL, -- 'started', 'completed', 'failed', 'partial'
    products_pushed INTEGER DEFAULT 0,
    products_pulled INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    details TEXT, -- JSON with detailed sync results
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ecommerce_connections_platform ON ecommerce_connections(platform);
CREATE INDEX IF NOT EXISTS idx_ecommerce_connections_active ON ecommerce_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_ecommerce_mappings_product ON ecommerce_product_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_mappings_connection ON ecommerce_product_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_mappings_remote ON ecommerce_product_mappings(remote_product_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_mappings_status ON ecommerce_product_mappings(sync_status);
CREATE INDEX IF NOT EXISTS idx_ecommerce_sync_logs_connection ON ecommerce_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_sync_logs_status ON ecommerce_sync_logs(status);
