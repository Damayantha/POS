import { useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, query, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function RealtimeSync() {
    const unsubscribers = useRef([]);
    const userRef = useRef(null);

    useEffect(() => {
        // 1. Auth Listener
        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            userRef.current = user;
            if (user) {
                console.log('[RealtimeSync] User logged in:', user.uid);
                startListeners(user.uid);
                // Trigger outbound sync to bring any offline changes to cloud
                window.electronAPI.sync.trigger();
            } else {
                console.log('[RealtimeSync] User logged out, clearing listeners');
                stopListeners();
            }
        });

        // 2. Outbound Listener (Main Process -> Renderer -> Firestore)
        const removeOutboundListener = window.electronAPI.sync.onOutbound((data) => {
            handleOutboundSync(data);
        });

        return () => {
            unsubAuth();
            stopListeners();
            if (removeOutboundListener) removeOutboundListener();
        };
    }, []);

    const startListeners = (uid) => {
        stopListeners(); // Clear existing

        const collections = [
            'products', 'customers', 'sales', 'employees',
            'gift_cards', 'bundles', 'promotions',
            'categories', 'suppliers', 'purchase_orders', 'receivings', 'supplier_invoices',
            'sale_items', 'purchase_order_items', 'receiving_items',
            'credit_sales', 'credit_payments',
            'quotations', 'quotation_items',
            'returns', 'return_items', 'supplier_payments'
        ];

        collections.forEach(table => {
            // Path: tenants/{uid}/{table}
            const colRef = collection(db, `tenants/${uid}/${table}`);

            const unsub = onSnapshot(colRef, (snapshot) => {
                if (snapshot.metadata.hasPendingWrites) {
                    // This is our own local write reflecting back. Ignore it to prevent loops.
                    return;
                }

                snapshot.docChanges().forEach((change) => {
                    const data = change.doc.data();
                    const record = {
                        ...data,
                        id: change.doc.id, // Prefer local ID if stored, else remote
                        remote_id: change.doc.id,
                        is_synced: 1
                    };

                    // If data has a 'local_id' field (saved previously), map it back to 'id' for SQLite?
                    // Or keep 'id' as is.
                    // For now, we assume incoming 'id' from Firestore might be a UUID.
                    // If it matches a local UUID, great.

                    if (change.type === 'added' || change.type === 'modified') {
                        // Send to Main Process to update SQLite
                        console.log(`[RealtimeSync] Incoming ${table}:`, record.id);
                        window.electronAPI.sync.incoming(table, record);
                    }
                });
            }, (error) => {
                console.error(`[RealtimeSync] Error listening to ${table}:`, error);
            });

            unsubscribers.current.push(unsub);
        });
    };

    const stopListeners = () => {
        unsubscribers.current.forEach(u => u && u());
        unsubscribers.current = [];
    };

    const handleOutboundSync = async ({ table, record }) => {
        if (!userRef.current) {
            console.warn('[RealtimeSync] Cannot sync outbound: No user');
            return;
        }

        try {
            const uid = userRef.current.uid;
            const docId = record.remote_id || record.id; // Use UUID

            const docRef = doc(db, `tenants/${uid}/${table}`, docId);

            const payload = {
                ...record,
                updated_at: new Date().toISOString(),
                source: 'desktop'
            };

            await setDoc(docRef, payload, { merge: true });
            console.log(`[RealtimeSync] Outbound success: ${table}/${docId}`);

            // Acknowledge to Main Process
            window.electronAPI.sync.ack(table, record.id, docId);

        } catch (error) {
            console.error('[RealtimeSync] Outbound failed:', error);
        }
    };

    return null; // Headless component
}
