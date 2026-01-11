import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * RealtimeSync - Optimized Firebase Sync Component
 * 
 * Features:
 * - Batch Firestore writes (up to 500 per batch)
 * - Online/offline detection
 * - Snapshot listeners for real-time updates
 */
export function RealtimeSync() {
    const unsubscribers = useRef([]);
    const userRef = useRef(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        // Online/offline detection
        const handleOnline = () => {
            setIsOnline(true);
            window.electronAPI?.sync?.setOnline?.(true);
        };
        const handleOffline = () => {
            setIsOnline(false);
            window.electronAPI?.sync?.setOnline?.(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Auth Listener
        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            userRef.current = user;
            if (user) {
                console.log('[RealtimeSync] User logged in:', user.uid);
                startListeners(user.uid);
                // Trigger outbound sync
                window.electronAPI.sync.trigger();
            } else {
                console.log('[RealtimeSync] User logged out');
                stopListeners();
            }
        });

        // Single record outbound (legacy)
        const removeOutboundListener = window.electronAPI.sync.onOutbound((data) => {
            handleOutboundSync(data);
        });

        // Batch outbound (optimized)
        const removeOutboundBatchListener = window.electronAPI.sync.onOutboundBatch?.((data) => {
            handleBatchOutbound(data);
        });

        return () => {
            unsubAuth();
            stopListeners();
            removeOutboundListener?.();
            removeOutboundBatchListener?.();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const startListeners = (uid) => {
        stopListeners();

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
            const colRef = collection(db, `tenants/${uid}/${table}`);

            const unsub = onSnapshot(colRef, (snapshot) => {
                if (snapshot.metadata.hasPendingWrites) return;

                // Batch incoming changes
                const batch = [];
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') {
                        const data = change.doc.data();
                        const record = {
                            ...data,
                            id: change.doc.id,
                            remote_id: change.doc.id,
                            is_synced: 1
                        };
                        batch.push({ table, record });
                    }
                });

                // Send batch to main process
                if (batch.length > 0) {
                    console.log(`[RealtimeSync] Incoming batch: ${batch.length} records`);
                    window.electronAPI.sync.incomingBatch?.(batch) ||
                        batch.forEach(({ table, record }) => window.electronAPI.sync.incoming(table, record));
                }
            }, (error) => {
                console.error(`[RealtimeSync] Error listening to ${table}:`, error);
            });

            unsubscribers.current.push(unsub);
        });
    };

    const stopListeners = () => {
        unsubscribers.current.forEach(u => u?.());
        unsubscribers.current = [];
    };

    // Single record outbound (legacy)
    const handleOutboundSync = async ({ table, record }) => {
        if (!userRef.current) return;

        try {
            const uid = userRef.current.uid;
            const docId = record.remote_id || record.id;
            const docRef = doc(db, `tenants/${uid}/${table}`, docId);

            await setDoc(docRef, {
                ...record,
                updated_at: new Date().toISOString(),
                source: 'desktop'
            }, { merge: true });

            console.log(`[RealtimeSync] Outbound: ${table}/${docId}`);
            window.electronAPI.sync.ack(table, record.id, docId);
        } catch (error) {
            console.error('[RealtimeSync] Outbound failed:', error);
        }
    };

    // Batch outbound (optimized - up to 500 per Firestore batch)
    const handleBatchOutbound = async ({ batch, timestamp, isRetry }) => {
        if (!userRef.current || batch.length === 0) return;

        const uid = userRef.current.uid;
        const successful = [];
        const failed = [];

        console.log(`[RealtimeSync] Processing batch of ${batch.length} records`);

        // Firestore allows max 500 operations per batch
        const BATCH_SIZE = 500;
        const chunks = [];
        for (let i = 0; i < batch.length; i += BATCH_SIZE) {
            chunks.push(batch.slice(i, i + BATCH_SIZE));
        }

        for (const chunk of chunks) {
            const firestoreBatch = writeBatch(db);

            for (const { table, record } of chunk) {
                try {
                    const docId = record.remote_id || record.id;
                    const docRef = doc(db, `tenants/${uid}/${table}`, docId);

                    firestoreBatch.set(docRef, {
                        ...record,
                        updated_at: new Date().toISOString(),
                        source: 'desktop'
                    }, { merge: true });

                    successful.push({
                        table,
                        localId: record.id,
                        remoteId: docId
                    });
                } catch (e) {
                    console.error(`[RealtimeSync] Batch prep error ${table}/${record.id}:`, e);
                    failed.push({ table, record, error: e.message });
                }
            }

            try {
                await firestoreBatch.commit();
                console.log(`[RealtimeSync] Batch committed: ${chunk.length} records`);
            } catch (e) {
                console.error('[RealtimeSync] Batch commit failed:', e);
                // Move all to failed
                for (const { table, record } of chunk) {
                    failed.push({ table, record, error: e.message });
                    // Remove from successful
                    const idx = successful.findIndex(s => s.localId === record.id);
                    if (idx >= 0) successful.splice(idx, 1);
                }
            }
        }

        // Send batch ACK to main process
        window.electronAPI.sync.batchAck?.({
            successful,
            failed,
            timestamp: Date.now()
        }) || successful.forEach(s => window.electronAPI.sync.ack(s.table, s.localId, s.remoteId));

        console.log(`[RealtimeSync] Batch complete: ${successful.length} ok, ${failed.length} failed`);
    };

    return null; // Headless component
}
