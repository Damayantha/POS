import { NextRequest, NextResponse } from 'next/server';

/**
 * Shopify OAuth Initiation
 * 
 * Redirects user to Shopify for authorization.
 * Query params:
 * - shop: The Shopify store domain (e.g., "my-store.myshopify.com")
 */

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const REDIRECT_URI = 'https://posbycirvex.web.app/api/oauth/shopify/callback';
const SCOPES = 'read_products,write_products,read_inventory,write_inventory';

export async function GET(request: NextRequest) {
    const shop = request.nextUrl.searchParams.get('shop');
    
    if (!shop) {
        return NextResponse.json(
            { error: 'Missing shop parameter. Example: ?shop=my-store.myshopify.com' },
            { status: 400 }
        );
    }

    if (!SHOPIFY_CLIENT_ID) {
        return NextResponse.json(
            { error: 'SHOPIFY_CLIENT_ID not configured' },
            { status: 500 }
        );
    }

    // Clean shop domain
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    
    // Build authorization URL
    const authUrl = new URL(`https://${cleanShop}/admin/oauth/authorize`);
    authUrl.searchParams.set('client_id', SHOPIFY_CLIENT_ID);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('state', state);

    // Set state in cookie for validation
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('shopify_oauth_state', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
    });
    response.cookies.set('shopify_oauth_shop', cleanShop, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 600,
    });

    return response;
}
