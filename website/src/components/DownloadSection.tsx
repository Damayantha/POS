'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Check, Loader2 } from 'lucide-react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { setDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export function DownloadSection() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [businessName, setBusinessName] = useState('')
    const [businessAddress, setBusinessAddress] = useState('')
    const [businessPhone, setBusinessPhone] = useState('')
    const [newsletter, setNewsletter] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // 1. Create User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // 2. Save User Profile with Newsletter pref
            // We use 'users' collection for profile data
            const userData = {
                email: user.email,
                newsletter: newsletter,
                createdAt: new Date(),
                plan: 'free', // Default to free plan
                subscriptionStatus: 'active',
                businessName: businessName,
                businessAddress: businessAddress,
                businessPhone: businessPhone
            };

            // DEBUG: Alert to verify data
            alert(`DEBUG: Creating account for Business: ${businessName}`);

            await setDoc(doc(db, "users", user.uid), userData)

            setSuccess(true)

            // 3. Trigger Download (Hardcoded to a dummy release or GitHub release if we had URL)
            // For now, prompt user to check dashboard or start download
            const link = document.createElement('a');
            link.href = '/POSbyCirvex-Setup.exe'; // Dummy path, normally would be GitHub release URL
            link.download = 'POSbyCirvex-Setup.exe';
            // link.click(); // Auto download?

        } catch (err: any) {
            console.error(err)
            if (err.code === 'auth/email-already-in-use') {
                setError('Email already in use. Please sign in instead.')
            } else {
                setError(err.message || 'Something went wrong.')
            }
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <section id="download" className="py-24 relative overflow-hidden">
                <div className="container mx-auto px-6 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="glass max-w-lg mx-auto p-12 rounded-2xl border border-green-500/20"
                    >
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                            <Check size={40} />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Account Created & Download Started!</h2>
                        <p className="text-muted-foreground mb-8">
                            Welcome to POSbyCirvex. You can now log into the Windows app with these credentials.
                        </p>
                        <div className="flex flex-col gap-4">
                            <a href="/dashboard" className="text-accent hover:underline font-bold">Go to Dashboard</a>
                            <p className="text-sm text-muted-foreground">Download didn't start? <a href="#" className="underline">Click here</a></p>
                        </div>
                    </motion.div>
                </div>
            </section>
        )
    }

    return (
        <section id="download" className="py-24 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px] -z-10" />

            <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center max-w-5xl">
                <div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to transform your business?</h2>
                    <p className="text-muted-foreground text-lg mb-8">
                        Get the production-ready build for Windows. Create an account to access features, sync data, and manage your subscription.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">1</div>
                            <span className="text-lg">Register your account</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">2</div>
                            <span className="text-lg">Download the installer</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">3</div>
                            <span className="text-lg">Sign in & Start selling</span>
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="glass p-8 rounded-2xl border border-white/10"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Download className="text-accent" />
                        <h3 className="text-2xl font-bold">Download & Register</h3>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-muted-foreground">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                                placeholder="you@company.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-muted-foreground">Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <h4 className="text-sm font-bold mb-3 text-white">Business Details</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-muted-foreground">Business Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                                        placeholder="My Store"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-muted-foreground">Address</label>
                                        <input
                                            type="text"
                                            value={businessAddress}
                                            onChange={(e) => setBusinessAddress(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                                            placeholder="123 Main St"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-muted-foreground">Phone</label>
                                        <input
                                            type="tel"
                                            value={businessPhone}
                                            onChange={(e) => setBusinessPhone(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                                            placeholder="+1 234 567 890"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                            <input
                                type="checkbox"
                                id="newsletter"
                                checked={newsletter}
                                onChange={(e) => setNewsletter(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-gray-600 text-accent focus:ring-accent accent-accent"
                            />
                            <label htmlFor="newsletter" className="text-sm text-muted-foreground cursor-pointer select-none">
                                <strong>Enable monthly newsletter.</strong> Get tips, updates, and retail insights directly to your inbox.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent text-white font-bold py-4 rounded-lg hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Create Account & Download'}
                        </button>

                        <p className="text-xs text-center text-muted-foreground mt-4">
                            By continuing, you agree to our Terms and Privacy Policy.
                            <br />Windows 10/11 (64-bit)
                        </p>
                    </form>
                </motion.div>
            </div>
        </section>
    )
}
