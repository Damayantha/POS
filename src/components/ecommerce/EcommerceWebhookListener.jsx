import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

/**
 * EcommerceWebhookListener
 * 
 * Listens to the ecommerce_events collection in Firestore for incoming
 * webhook events from Shopify/WooCommerce/Etsy and forwards them to the
 * Electron main process for processing.
 */
export function EcommerceWebhookListener() {
    const unsubscribeRef = useRef(null);

    useEffect(() => {
        // Only start listening if user is authenticated
        if (!auth.currentUser) return;

        const uid = auth.currentUser.uid;
        
        // Listen to ecommerce_events that haven't been processed yet
        const eventsRef = collection(db, 'tenants', uid, 'ecommerce_events');
        const q = query(
            eventsRef,
            where('processed', '==', false),
            orderBy('receivedAt', 'desc'),
            limit(50)
        );

        console.log('[ECOMMERCE] Starting webhook event listener');

        unsubscribeRef.current = onSnapshot(q, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const event = { id: change.doc.id, ...change.doc.data() };
                    console.log('[ECOMMERCE] New webhook event:', event.platform, event.type);
                    
                    try {
                        // Forward to main process
                        if (window.electronAPI?.ecommerce?.webhookEvent) {
                            const result = await window.electronAPI.ecommerce.webhookEvent(event);
                            console.log('[ECOMMERCE] Event processed:', result);
                        }
                        
                        // Mark as processed in Firestore
                        await updateDoc(doc(eventsRef, change.doc.id), {
                            processed: true,
                            processedAt: new Date().toISOString()
                        });
                    } catch (error) {
                        console.error('[ECOMMERCE] Failed to process webhook event:', error);
                    }
                }
            }
        }, (error) => {
            console.error('[ECOMMERCE] Webhook listener error:', error);
        });

        return () => {
            if (unsubscribeRef.current) {
                console.log('[ECOMMERCE] Stopping webhook event listener');
                unsubscribeRef.current();
            }
        };
    }, []);

    // This is a headless component, no UI
    return null;
}
