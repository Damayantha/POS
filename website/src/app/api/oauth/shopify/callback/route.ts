import { NextRequest, NextResponse } from 'next/server';

/**
 * Shopify OAuth Callback
 * 
 * Handles the callback from Shopify after user authorization.
 * Exchanges the authorization code for an access token.
 * Redirects to POS app via deep link with the token.
 */

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');
    const shop = request.nextUrl.searchParams.get('shop');
    const state = request.nextUrl.searchParams.get('state');

    // Validate required params
    if (!code) {
        return NextResponse.json(
            { error: 'Missing authorization code' },
            { status: 400 }
        );
    }

    if (!shop) {
        return NextResponse.json(
            { error: 'Missing shop parameter' },
            { status: 400 }
        );
    }

    if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
        return NextResponse.json(
            { error: 'OAuth credentials not configured' },
            { status: 500 }
        );
    }

    // Validate shop domain format (basic security check)
    if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
        return NextResponse.json(
            { error: 'Invalid shop domain format' },
            { status: 400 }
        );
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: SHOPIFY_CLIENT_ID,
                client_secret: SHOPIFY_CLIENT_SECRET,
                code: code,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Token exchange failed:', errorText);
            return NextResponse.json(
                { error: 'Failed to exchange authorization code', details: errorText },
                { status: 500 }
            );
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        const scope = tokenData.scope;

        // Get shop info for store name
        const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
            },
        });

        let storeName = shop.replace('.myshopify.com', '');
        if (shopInfoResponse.ok) {
            const shopInfo = await shopInfoResponse.json();
            storeName = shopInfo.shop?.name || storeName;
        }

        // Redirect to POS app via deep link
        const deepLinkUrl = new URL('posbycirvex://shopify/callback');
        deepLinkUrl.searchParams.set('token', accessToken);
        deepLinkUrl.searchParams.set('shop', shop);
        deepLinkUrl.searchParams.set('name', storeName);
        deepLinkUrl.searchParams.set('scope', scope || '');

        return NextResponse.redirect(deepLinkUrl.toString());
    } catch (error) {
        console.error('OAuth callback error:', error);
        return NextResponse.json(
            { error: 'OAuth callback failed', details: String(error) },
            { status: 500 }
        );
    }
}
