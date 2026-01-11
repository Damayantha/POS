import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
// Uses FIREBASE_SERVICE_ACCOUNT environment variable (JSON string)
function getAdminApp() {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountJson) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);

    return initializeApp({
        credential: cert(serviceAccount),
        projectId: 'posbycirvex',
    });
}

export function getAdminFirestore() {
    const app = getAdminApp();
    return getFirestore(app);
}
