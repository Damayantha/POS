/**
 * E-commerce Platform Adapters
 * Export all available e-commerce platform adapters
 */

const ShopifyAdapter = require('./adapters/ShopifyAdapter');
const WooCommerceAdapter = require('./adapters/WooCommerceAdapter');

module.exports = {
    ShopifyAdapter,
    WooCommerceAdapter,
};
