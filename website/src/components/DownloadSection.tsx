'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, Check, Loader2 } from 'lucide-react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { setDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface GitHubAsset {
    name: string;
    browser_download_url: string;
}

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
    
    // OS and Download State
    const [os, setOS] = useState<'windows' | 'mac' | 'linux' | 'unknown'>('windows')
    const [downloadUrl, setDownloadUrl] = useState('')
    const [version, setVersion] = useState('')
    const [assets, setAssets] = useState<GitHubAsset[]>([])


    // Detect OS
    useEffect(() => {
        if (typeof window === 'undefined') return
        const userAgent = window.navigator.userAgent.toLowerCase()
        if (userAgent.includes('win')) setOS('windows')
        else if (userAgent.includes('mac')) setOS('mac')
        else if (userAgent.includes('linux')) setOS('linux')
        else setOS('unknown')
    }, [])

    // Fetch Latest Release
    useEffect(() => {
        const fetchRelease = async () => {
            try {
                const res = await fetch('https://api.github.com/repos/Damayantha/POS/releases/latest')
                if (!res.ok) return
                const data = await res.json()
                setVersion(data.tag_name)
                setAssets(data.assets)

                // Determine download URL based on OS matches
                // Windows: .exe
                // Mac: .dmg
                // Linux: .AppImage
                // Fallback can be calculated if API limit reached
            } catch (e) {
                console.error('Failed to fetch release info', e)
            }
        }
        fetchRelease()
    }, [])

    // Update download URL when OS or Assets change
    useEffect(() => {
        if (assets.length === 0) return

        let targetExt = '.exe'
        if (os === 'mac') targetExt = '.dmg'
        if (os === 'linux') targetExt = '.AppImage'

        const asset = assets.find((a: GitHubAsset) => a.name.endsWith(targetExt))
        if (asset) {
            setDownloadUrl(asset.browser_download_url)
        }
    }, [os, assets])


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // 1. Create User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // 2. Save User Profile with Newsletter pref
            const userData = {
                email: user.email,
                newsletter: newsletter,
                createdAt: new Date(),
                plan: 'free', 
                subscriptionStatus: 'active',
                businessName: businessName,
                businessAddress: businessAddress,
                businessPhone: businessPhone
            };

            await setDoc(doc(db, "users", user.uid), userData)
            setSuccess(true)

            // 3. Trigger Download
            const link = document.createElement('a');
            // Use fetched URL or static fallback
            if (downloadUrl) {
                link.href = downloadUrl;
            } else {
                 // Fallback with correct file names
                 const v = '1.1.2'
                 if (os === 'mac') link.href = `https://github.com/Damayantha/POS/releases/download/v${v}/Cirvex-One-${v}.dmg`
                 else if (os === 'linux') link.href = `https://github.com/Damayantha/POS/releases/download/v${v}/Cirvex-One-${v}.AppImage`
                 else link.href = `https://github.com/Damayantha/POS/releases/download/v${v}/Cirvex-One-Setup-${v}.exe`
            }
            // Force download behavior
            link.click(); 

        } catch (err: unknown) {
            console.error(err)
            const errorObj = err as { code?: string; message?: string }
            if (errorObj.code === 'auth/email-already-in-use') {
                setError('Email already in use. Please sign in instead.')
            } else {
                setError(errorObj.message || 'Something went wrong.')
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
                         <p className="text-muted-foreground mb-4">
                            We detected you are on <strong>{os === 'mac' ? 'macOS' : os === 'linux' ? 'Linux' : 'Windows'}</strong>.
                        </p>
                        <p className="text-sm text-muted-foreground mb-8">
                           If the download didn&apos;t start automatically, <a href={downloadUrl || "https://github.com/Damayantha/POS/releases/latest"} className="underline text-accent">click here</a>.
                        </p>
                        
                        <div className="flex flex-col gap-4">
                            <a href="/dashboard" className="text-accent hover:underline font-bold">Go to Dashboard</a>
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
                        Get the production-ready build for your platform. Create an account to access features, sync data, and manage your subscription.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">1</div>
                            <span className="text-lg">Register your account</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">2</div>
                            <span className="text-lg">Download for {os === 'mac' ? 'macOS' : os === 'linux' ? 'Linux' : 'Windows'}</span>
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
                            className="w-full bg-accent text-white font-bold py-4 px-6 rounded-lg hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal h-auto leading-tight"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 
                             `Create Account & Download for ${os === 'mac' ? 'macOS' : os === 'linux' ? 'Linux' : 'Windows'}`
                            }
                        </button>
                        
                        <div className="flex flex-wrap gap-3 justify-center mt-4">
                             <span className="text-xs text-muted-foreground w-full text-center mb-1">Also available for:</span>
                             {os !== 'windows' && (
                                 <button 
                                     type="button"
                                     onClick={() => setOS('windows')}
                                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-sm text-muted-foreground hover:text-white cursor-pointer"
                                 >
                                     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.949"/></svg>
                                     Windows
                                 </button>
                             )}
                             {os !== 'mac' && (
                                 <button 
                                     type="button"
                                     onClick={() => setOS('mac')}
                                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-sm text-muted-foreground hover:text-white cursor-pointer"
                                 >
                                     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                                     macOS
                                 </button>
                             )}
                             {os !== 'linux' && (
                                 <button 
                                     type="button"
                                     onClick={() => setOS('linux')}
                                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-sm text-muted-foreground hover:text-white cursor-pointer"
                                 >
                                     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139z"/></svg>
                                     Linux
                                 </button>
                             )}
                        </div>

                        <p className="text-xs text-center text-muted-foreground mt-4">
                            By continuing, you agree to our Terms and Privacy Policy.
                            <br />
                            Detected: {os === 'mac' ? 'macOS' : os === 'linux' ? 'Linux' : 'Windows'} {version ? `(${version})` : ''}
                        </p>
                    </form>
                </motion.div>
            </div>
        </section>
    )
}
