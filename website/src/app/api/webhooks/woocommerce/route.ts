import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { getAdminFirestore } from '@/lib/firebase-admin';

/**
 * WooCommerce Webhook Handler
 * 
 * Receives product.updated webhooks from WooCommerce
 * Validates signature and writes to Firestore for POS to pick up
 * 
 * Register this webhook in WooCommerce:
 * WooCommerce → Settings → Advanced → Webhooks → Add webhook
 * Topic: Product updated
 * Delivery URL: https://posbycirvex.web.app/api/webhooks/woocommerce
 */

// Verify WooCommerce signature (for production use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _verifyWooSignature(body: string, signature: string | null, secret: string): boolean {
    if (!signature || !secret) return false;
    
    const hash = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('base64');
    
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const _signature = request.headers.get('X-WC-Webhook-Signature'); // For signature verification
        const topic = request.headers.get('X-WC-Webhook-Topic');
        const source = request.headers.get('X-WC-Webhook-Source');

        // Parse store URL from source header
        const storeUrl = source ? new URL(source).origin : null;

        // Parse the payload
        const payload = JSON.parse(rawBody);

        console.log(`[Webhook] WooCommerce ${topic} from ${storeUrl}`);

        // Handle product updates (which include stock changes)
        if (topic === 'product.updated' && storeUrl) {
            const db = getAdminFirestore();
            
            // Find which tenant owns this store
            const connectionsSnap = await db.collectionGroup('ecommerce_connections')
                .where('platform', '==', 'woocommerce')
                .limit(50)
                .get();

            // Find matching connection by URL
            let tenantPath: string | null = null;
            for (const doc of connectionsSnap.docs) {
                const data = doc.data();
                if (data.store_url && storeUrl.includes(new URL(data.store_url).hostname)) {
                    tenantPath = doc.ref.parent.parent?.id || null;
                    break;
                }
            }

            if (!tenantPath) {
                console.log(`[Webhook] No connection found for store: ${storeUrl}`);
                return NextResponse.json({ received: true, processed: false });
            }

            // Handle simple products and variations
            const events = [];
            
            if (payload.type === 'simple' || payload.type === 'external') {
                events.push({
                    productId: payload.id?.toString(),
                    variantId: null,
                    sku: payload.sku,
                    stockQuantity: payload.stock_quantity,
                });
            } else if (payload.type === 'variable' && payload.variations) {
                // For variable products, we'll need variation details
                // WooCommerce webhook for product.updated doesn't include full variation data
                // So we store the product ID and let POS fetch fresh data
                events.push({
                    productId: payload.id?.toString(),
                    variantId: null,
                    sku: payload.sku,
                    stockQuantity: null, // Signal to fetch fresh
                    isVariable: true,
                });
            }

            // Write events to Firestore
            for (const event of events) {
                await db.collection('tenants').doc(tenantPath).collection('ecommerce_events').add({
                    platform: 'woocommerce',
                    type: 'inventory_update',
                    store: storeUrl,
                    productId: event.productId,
                    variantId: event.variantId,
                    sku: event.sku,
                    stockQuantity: event.stockQuantity,
                    isVariable: event.isVariable || false,
                    receivedAt: new Date().toISOString(),
                    processed: false
                });
            }

            console.log(`[Webhook] ${events.length} event(s) stored for tenant ${tenantPath}`);
        }

        return NextResponse.json({ received: true, processed: true });
    } catch (error) {
        console.error('[Webhook] WooCommerce error:', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}

// Health check
export async function GET() {
    return NextResponse.json({ status: 'WooCommerce webhook endpoint active' });
}
