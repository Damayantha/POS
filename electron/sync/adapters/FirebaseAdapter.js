const https = require('https');

class FirebaseAdapter {
    constructor(settings) {
        // We really need the Project ID. 
        // options: 1. Pass in settings. 2. Parse from token (aud). 3. Hardcode (not ideal for distribution).
        // Since we don't have it in settings yet, I'll use the one from the user's project or ask them.
        // For now, I'll attempt to extract it from the token 'aud' field if possible, or use a default.
        this.projectId = 'pos-by-cirvex-74271';
        this.token = null;
        this.uid = null;
    }

    async init() {
        console.log('FirebaseAdapter: Initialized');
        return true;
    }

    setToken(token) {
        this.token = token;
        if (token) {
            this.uid = this.parseJwt(token).user_id || this.parseJwt(token).sub;
            // Also try to update Project ID if available in token audience
            const aud = this.parseJwt(token).aud;
            if (aud && aud !== 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit') {
                // aud is often the project ID in standard JWTs, but for Firebase Auth it might be the project ID too.
                this.projectId = aud;
            }
        }
    }

    parseJwt(token) {
        try {
            return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        } catch (e) {
            return {};
        }
    }

    async push(table, record) {
        if (!this.token || !this.uid) {
            console.warn('[FirebaseAdapter] No token/UID, cannot push');
            return false;
        }

        try {
            // Firestore REST API
            const docId = record.id || record.local_id || 'unknown';
            console.log(`[FirebaseAdapter] Pushing to ${table}/${docId}`);

            const path = `tenants/${this.uid}/${table}/${docId}`;
            const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${path}`;

            const firestoreFields = {};
            for (const [key, val] of Object.entries(record)) {
                firestoreFields[key] = this.toFirestoreValue(val);
            }
            const method = 'PATCH';

            const body = JSON.stringify({
                fields: firestoreFields
            });

            console.log('[FirebaseAdapter] Payload:', body);

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: body
            });

            if (!response.ok) {
                const err = await response.text();
                console.error(`[FirebaseAdapter] Push Failed ${table}/${docId}:`, response.status, err);
                throw new Error(err);
            }

            // const data = await response.json();
            console.log(`[FirebaseAdapter] Push Success: ${table}/${docId}`);

            return { remote_id: docId, updated_at: new Date().toISOString() };

        } catch (e) {
            console.error('[FirebaseAdapter] Push error', e.message);
            return false;
        }
    }

    async pull(table, lastSyncTimestamp) {
        if (!this.token || !this.uid) return [];

        try {
            // Firestore Query
            // We want all documents in collection `tenants/{uid}/{table}` where updated_at > lastSync

            const collectionPath = `projects/${this.projectId}/databases/(default)/documents/tenants/${this.uid}/${table}`;

            // Complex queries via REST are tricky (runQuery).
            // Simplest for now: List documents. If the list is huge, we need runQuery.
            // Let's use runQuery to filter by updated_at?
            // Actually, for MVP 'ListDocuments' is easier but doesn't support sophisticated filtering easily without composite indexes.
            // Let's just List all for now (if dataset is small) or List with limit.
            // A better way for "Sync" is usually 'runQuery' with a structured query.

            // Construct runQuery URL
            const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:runQuery`;

            const query = {
                structuredQuery: {
                    from: [{ collectionId: table }],
                    // We must filter by parent path manually in the layout or logic?
                    // No, runQuery runs against the root. 
                    // Actually, to query subcollection: we usually query {parent}/collection.
                    // But our structure is tenants/{uid}/{table}. {table} is a subcollection of {uid}.
                    // So we target the specific parent doc? 
                    // No, we cannot "List ALL products" across all tenants (Secure!).
                    // Access is restricted by Rules.
                    // But we are querying as a user.
                    // Parent: projects/{projectId}/databases/(default)/documents/tenants/{uid}
                }
            };

            // Because {table} is a dynamic subcollection, we need to target the parent document explicitly in the URL if using runQuery with scope? 
            // Or use the 'parent' param in runQuery.

            const parent = `projects/${this.projectId}/databases/(default)/documents/tenants/${this.uid}`;

            const runQueryBody = {
                structuredQuery: {
                    from: [{ collectionId: table }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'updated_at' },
                            op: 'GREATER_THAN',
                            value: { stringValue: new Date(lastSyncTimestamp || 0).toISOString() }
                        }
                    }
                }
            };

            const response = await fetch(url + `?parent=${parent}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(runQueryBody)
            });


            if (!response.ok) {
                // Fallback: If index is missing or error, maybe just list latest 50?
                // console.warn('Firebase Pull runQuery failed, falling back to list', await response.text());
                return [];
            }

            const results = await response.json();
            // Results is array of { document: {}, readTime: ... }

            return results.map(res => {
                if (!res.document) return null;
                return this.fromFirestoreValue(res.document);
            }).filter(Boolean);

        } catch (e) {
            console.error('FirebaseAdapter: Pull error', e);
            return [];
        }
    }

    // --- Helpers ---

    toFirestoreValue(value) {
        // Recursively convert JS object to Firestore Value format
        if (value === null || value === undefined) return { nullValue: null };
        if (typeof value === 'boolean') return { booleanValue: value };
        if (typeof value === 'number') {
            if (Number.isInteger(value)) return { integerValue: value };
            return { doubleValue: value };
        }
        if (typeof value === 'string') return { stringValue: value };
        if (Array.isArray(value)) {
            return { arrayValue: { values: value.map(v => this.toFirestoreValue(v)) } };
        }
        if (typeof value === 'object') {
            const fields = {};
            for (const k in value) {
                fields[k] = this.toFirestoreValue(value[k]);
            }
            return { mapValue: { fields } };
        }
        return { stringValue: String(value) };
    }

    fromFirestoreValue(doc) {
        // doc.name = "projects/.../documents/..."
        // doc.fields = { key: { stringValue: ... } }
        const obj = {};
        const fields = doc.fields || {};

        for (const k in fields) {
            obj[k] = this.extractValue(fields[k]);
        }

        // Extract ID from path if not in fields
        const pathParts = doc.name.split('/');
        obj.remote_id = pathParts[pathParts.length - 1]; // Document ID

        return obj;
    }

    extractValue(field) {
        if (field.stringValue !== undefined) return field.stringValue;
        if (field.integerValue !== undefined) return Number(field.integerValue);
        if (field.doubleValue !== undefined) return Number(field.doubleValue);
        if (field.booleanValue !== undefined) return field.booleanValue;
        if (field.nullValue !== undefined) return null;
        if (field.timestampValue !== undefined) return field.timestampValue; // Keep as string for now
        if (field.mapValue !== undefined) {
            const map = {};
            for (const k in field.mapValue.fields) {
                map[k] = this.extractValue(field.mapValue.fields[k]);
            }
            return map;
        }
        if (field.arrayValue !== undefined) {
            return (field.arrayValue.values || []).map(v => this.extractValue(v));
        }
        return null;
    }
}

module.exports = FirebaseAdapter;
