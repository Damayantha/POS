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
            // Use fetched URL or reasonable fallback
            if (downloadUrl) {
                link.href = downloadUrl;
            } else {
                 // Fallback if API failed
                 const v = version || '1.0.0' // Default fallback version
                 if (os === 'mac') link.href = `https://github.com/Damayantha/POS/releases/download/${v}/POS.by.Cirvex-${v.replace('v','')}.dmg` // Approximation
                 else if (os === 'linux') link.href = `https://github.com/Damayantha/POS/releases/download/${v}/POS.by.Cirvex-${v.replace('v','')}.AppImage`
                 else link.href = `https://github.com/Damayantha/POS/releases/download/${v}/POS.by.Cirvex.Setup.${v.replace('v','')}.exe`
                 
                 // If version is empty, fallback to latest/download route which might be 404 but better than nothing or specific file
                 if (!version) link.href = 'https://github.com/Damayantha/POS/releases/latest'
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
                             <span className="text-xs text-muted-foreground w-full text-center mb-1">Other platforms:</span>
                           {assets.length > 0 ? (
                                <>
                                    {os !== 'windows' && (
                                        <a 
                                            href={assets.find(a => a.name.endsWith('.exe'))?.browser_download_url} 
                                            target="_blank" 
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-sm text-muted-foreground hover:text-white"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.949"/></svg>
                                            Windows
                                        </a>
                                    )}
                                    {os !== 'mac' && (
                                        <a 
                                            href={assets.find(a => a.name.endsWith('.dmg'))?.browser_download_url} 
                                            target="_blank" 
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-sm text-muted-foreground hover:text-white"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                                            macOS
                                        </a>
                                    )}
                                    {os !== 'linux' && (
                                        <a 
                                            href={assets.find(a => a.name.endsWith('.AppImage'))?.browser_download_url} 
                                            target="_blank" 
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-sm text-muted-foreground hover:text-white"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.163.027.234.004-.002.008-.006.01-.009l.007.007c.031.07.06.143.115.203l.02.021.025.02c.088.064.146.133.263.133h.004a.464.464 0 00.09-.009c.052.064.107.132.157.197-.102.053-.262.137-.338.134a.57.57 0 01-.39-.155 1.495 1.495 0 01-.347-.548 1.964 1.964 0 01-.174-.868c0-.064.003-.128.01-.192a1.904 1.904 0 01.158-.726c.106-.206.266-.403.459-.535.198-.132.418-.198.644-.198zm.529 15.136c-.1.077-.203.202-.305.264-.144.075-.271.162-.386.25-.12.091-.24.287-.286.42-.212.065-.434.13-.715.13-.9 0-1.725-.4-2.55-.4-.824 0-1.65.4-2.475.4-.413 0-.766-.063-1.053-.198.014-.159.046-.316.062-.476.06-.53.192-.964.405-1.32.191-.33.452-.6.717-.865.232-.24.48-.53.668-.794.074-.1.135-.202.191-.31.032-.064.06-.127.085-.191.011-.023.02-.045.03-.067.01-.022.019-.044.025-.067.003-.009.005-.018.007-.025.002-.008.004-.016.005-.024.002-.007.002-.013.002-.019.002-.006.002-.01.002-.016 0-.007 0-.014-.002-.022-.002-.007-.002-.016-.004-.025a.268.268 0 00-.012-.034.175.175 0 00-.017-.032c-.178-.265-.356-.53-.485-.842-.213-.51-.353-1.035-.406-1.568-.052-.526-.026-1.06.084-1.585a6.116 6.116 0 01.376-1.247c.164-.35.368-.667.607-.939a3.1 3.1 0 012.43-1.179c.405.015.744.088 1.06.2.309.111.567.265.81.455a6.116 6.116 0 01.62 3.94c-.1.59-.274 1.18-.526 1.702-.254.535-.577.99-.957 1.38a6.166 6.166 0 01-1.234 1.03c-.202.115-.456.23-.78.315-.136.035-.278.064-.428.09a7.092 7.092 0 00-.34.065c-.1.023-.18.048-.252.078-.058.025-.112.058-.17.15-.026.04-.05.082-.07.127a.625.625 0 00-.044.144c-.008.04-.012.082-.012.125 0 .059.002.116.006.172.008.112.032.223.068.33.046.134.11.265.187.389a1.62 1.62 0 00.3.35c.125.113.28.23.459.332.179.103.385.198.615.266.23.067.48.099.74.097l.054-.002.055-.003h.008l.063-.005.067-.007c.024-.003.047-.006.072-.01l.073-.01c.024-.004.05-.01.074-.015.06-.012.12-.025.18-.042.058-.016.118-.037.178-.058.055-.02.111-.04.168-.062.028-.012.058-.025.086-.038.03-.014.058-.03.086-.045.27-.131.526-.319.764-.52zm-2.905-6.15l-.016-.016a.174.174 0 00.016.016z"/></svg>
                                            Linux
                                        </a>
                                    )}
                                </>
                           ) : (
                                <a href="https://github.com/Damayantha/POS/releases/latest" target="_blank" className="text-xs hover:text-white underline text-muted-foreground">View all versions on GitHub</a>
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
