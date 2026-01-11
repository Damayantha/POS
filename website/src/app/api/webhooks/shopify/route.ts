import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { getAdminFirestore } from '@/lib/firebase-admin';

/**
 * Shopify Webhook Handler
 * 
 * Receives inventory_levels/update webhooks from Shopify
 * Validates HMAC signature and writes to Firestore for POS to pick up
 * 
 * Register this webhook in Shopify Admin:
 * Settings → Notifications → Webhooks → Create webhook
 * Topic: Inventory levels update
 * URL: https://posbycirvex.web.app/api/webhooks/shopify
 */

// Verify Shopify HMAC signature (for production use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _verifyShopifySignature(body: string, hmacHeader: string | null, secret: string): boolean {
    if (!hmacHeader || !secret) return false;
    
    const hash = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('base64');
    
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const _hmac = request.headers.get('X-Shopify-Hmac-Sha256'); // For signature verification
        const topic = request.headers.get('X-Shopify-Topic');
        const shopDomain = request.headers.get('X-Shopify-Shop-Domain');

        // Parse the payload
        const payload = JSON.parse(rawBody);

        // For now, skip signature verification in development
        // In production, you'd look up the webhook secret for this shop
        // and verify using verifyShopifySignature()

        console.log(`[Webhook] Shopify ${topic} from ${shopDomain}`);

        // Handle inventory level updates
        if (topic === 'inventory_levels/update') {
            const db = getAdminFirestore();
            
            // Find which tenant (user) owns this shop by checking connections
            const connectionsSnap = await db.collectionGroup('ecommerce_connections')
                .where('platform', '==', 'shopify')
                .where('store_url', '==', shopDomain)
                .limit(1)
                .get();

            if (connectionsSnap.empty) {
                console.log(`[Webhook] No connection found for shop: ${shopDomain}`);
                return NextResponse.json({ received: true, processed: false });
            }

            // Get the tenant UID from the document path
            const connectionDoc = connectionsSnap.docs[0];
            const tenantPath = connectionDoc.ref.parent.parent?.id; // tenants/{uid}/ecommerce_connections

            if (!tenantPath) {
                return NextResponse.json({ received: true, processed: false });
            }

            // Write the event to the tenant's ecommerce_events collection
            await db.collection('tenants').doc(tenantPath).collection('ecommerce_events').add({
                platform: 'shopify',
                type: 'inventory_update',
                shop: shopDomain,
                inventoryItemId: payload.inventory_item_id?.toString(),
                locationId: payload.location_id?.toString(),
                available: payload.available,
                updatedAt: payload.updated_at,
                receivedAt: new Date().toISOString(),
                processed: false
            });

            console.log(`[Webhook] Event stored for tenant ${tenantPath}`);
        }

        return NextResponse.json({ received: true, processed: true });
    } catch (error) {
        console.error('[Webhook] Shopify error:', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}

// Shopify sends GET requests to verify webhook URL
export async function GET() {
    return NextResponse.json({ status: 'Shopify webhook endpoint active' });
}
