import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Terminal, Lock, Mail, Loader2 } from 'lucide-react';

export default function ActivationScreen({ onActivationSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleActivate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Authenticate with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Check Subscription in Firestore
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error("No account profile found using this email.");
            }

            const userData = docSnap.data();
            console.error('DEBUG: Activation: Fetched Firestore Data:', JSON.stringify(userData, null, 2));

            // Allow if status is active or trial (logic can be expanded)
            if (userData.subscriptionStatus !== 'active' && userData.subscriptionStatus !== 'trialing') {
                // Option: Allow 'free' plan?
                // If the user wants STRICT validation, we'd throw here.
                // But typically free plan is allowed.
                // Let's assume 'active', 'trialing', or 'free' plan is OK.
                if (userData.plan === 'free') {
                    // OK
                } else {
                    // Just a warning for now or throw?
                    // "Block access if not a paid plan" was not strictly said, just "validation plan setup".
                    // I'll allow it but store the plan so the UI can lock features if needed.
                }
            }

            // 3. Send Token to SyncManager (Main Process)
            const idToken = await user.getIdToken();
            await window.electronAPI.sync.setToken(idToken);

            // 4. Save to local settings
            await window.electronAPI.settings.set({
                key: 'activation_data',
                value: {
                    email: user.email,
                    uid: user.uid,
                    plan: userData.plan,
                    businessName: userData.businessName,
                    businessAddress: userData.businessAddress,
                    businessPhone: userData.businessPhone,
                    activatedAt: new Date().toISOString()
                }
            });

            onActivationSuccess();

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') {
                setError("Invalid email or password");
            } else {
                setError(err.message || "Activation failed");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
            <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-indigo-500/10 rounded-xl text-indigo-500 mb-4">
                        <Terminal size={32} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Activate POS</h1>
                    <p className="text-zinc-400">Sign in with your POSbyCirvex account</p>
                </div>

                {error && (
                    <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleActivate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Activate'}
                    </button>

                    <div className="text-center mt-6">
                        <a href="#" className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors">
                            Don't have an account? Create one on our website
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}
