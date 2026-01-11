'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Download, Monitor, Apple, Terminal } from 'lucide-react'

interface GitHubAsset {
    name: string;
    browser_download_url: string;
    size: number;
}

interface ReleaseData {
    tag_name: string;
    assets: GitHubAsset[];
}

type OSType = 'windows' | 'mac' | 'linux';

export function Hero() {
    const [os, setOS] = useState<OSType>('windows')
    const [selectedOS, setSelectedOS] = useState<OSType | null>(null)
    const [version, setVersion] = useState('')
    const [assets, setAssets] = useState<GitHubAsset[]>([])
    const [loading, setLoading] = useState(false)

    // Detect OS on mount
    useEffect(() => {
        if (typeof window === 'undefined') return
        const userAgent = window.navigator.userAgent.toLowerCase()
        // Use setTimeout to avoid synchronous setState in effect
        const timer = setTimeout(() => {
            if (userAgent.includes('mac')) setOS('mac')
            else if (userAgent.includes('linux')) setOS('linux')
            // windows is default, no need to set
        }, 0)
        return () => clearTimeout(timer)
    }, [])

    // Fetch Latest Release
    useEffect(() => {
        const fetchRelease = async () => {
            try {
                const res = await fetch('https://api.github.com/repos/Damayantha/POS/releases/latest')
                if (!res.ok) return
                const data: ReleaseData = await res.json()
                setVersion(data.tag_name)
                setAssets(data.assets)
            } catch (e) {
                console.error('Failed to fetch release info', e)
            }
        }
        fetchRelease()
    }, [])

    const activeOS = selectedOS || os
    
    // Static download URLs fallback for when API doesn't return assets (draft releases)
    const STATIC_VERSION = '1.1.0'
    const STATIC_DOWNLOADS: Record<OSType, string> = {
        windows: `https://github.com/Damayantha/POS/releases/download/v${STATIC_VERSION}/Cirvex-One-Setup-${STATIC_VERSION}.exe`,
        mac: `https://github.com/Damayantha/POS/releases/download/v${STATIC_VERSION}/Cirvex-One-${STATIC_VERSION}.dmg`,
        linux: `https://github.com/Damayantha/POS/releases/download/v${STATIC_VERSION}/Cirvex-One-${STATIC_VERSION}.AppImage`
    }

    const getDownloadUrl = (targetOS: OSType): string => {
        const extMap: Record<OSType, string> = {
            windows: '.exe',
            mac: '.dmg',
            linux: '.AppImage'
        }
        const asset = assets.find(a => a.name.endsWith(extMap[targetOS]))
        // Use API asset URL if available, otherwise use static fallback
        return asset?.browser_download_url || STATIC_DOWNLOADS[targetOS]
    }

    const getFileSize = (targetOS: OSType): string => {
        const extMap: Record<OSType, string> = {
            windows: '.exe',
            mac: '.dmg',
            linux: '.AppImage'
        }
        const asset = assets.find(a => a.name.endsWith(extMap[targetOS]))
        if (!asset) return ''
        const sizeMB = (asset.size / (1024 * 1024)).toFixed(1)
        return `${sizeMB} MB`
    }

    const getOSLabel = (targetOS: OSType): string => {
        const labels: Record<OSType, string> = {
            windows: 'Windows',
            mac: 'macOS',
            linux: 'Linux'
        }
        return labels[targetOS]
    }

    const getOSIcon = (targetOS: OSType) => {
        const iconProps = { size: 16 }
        switch(targetOS) {
            case 'mac': return <Apple {...iconProps} />
            case 'linux': return <Terminal {...iconProps} />
            default: return <Monitor {...iconProps} />
        }
    }

    const handleDownload = () => {
        setLoading(true)
        const url = getDownloadUrl(activeOS)
        window.open(url, '_blank')
        setTimeout(() => setLoading(false), 1000)
    }

    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Background Gradients (Subtle) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
            </div>

            <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                        </span>
                        {version || 'v1.1.0'} Now Available
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
                        Modern POS for <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-gray-500">
                            Smart Business
                        </span>
                    </h1>

                    <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                        Experience the future of point-of-sale systems. Offline-first, reliable, and designed for speed.
                        Manage inventory, sales, and customers with a production-ready desktop application.
                    </p>

                    <div className="flex flex-col gap-4 mb-8">
                        {/* Primary Download Button */}
                        <button
                            onClick={handleDownload}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-lg hover:bg-white/90 transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] w-fit cursor-pointer disabled:opacity-70"
                        >
                            <Download size={20} />
                            Download for {getOSLabel(activeOS)}
                            {getFileSize(activeOS) && (
                                <span className="text-sm opacity-70">({getFileSize(activeOS)})</span>
                            )}
                        </button>

                        {/* Platform Selector */}
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Also available for:</span>
                            {(['windows', 'mac', 'linux'] as OSType[]).filter(p => p !== activeOS).map(platform => (
                                <button
                                    key={platform}
                                    onClick={() => setSelectedOS(platform)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-muted-foreground hover:text-white cursor-pointer"
                                >
                                    {getOSIcon(platform)}
                                    {getOSLabel(platform)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span>Free Tier Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span>No Credit Card Required</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative"
                >
                    {/* Abstract App Mockup */}
                    <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl border border-white/10 glass-card transform rotate-1 hover:rotate-0 transition-transform duration-500">
                        <div className="h-8 bg-black/50 flex items-center px-4 gap-2 border-b border-white/5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="aspect-[16/10] bg-black/40 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                            {/* Simulated UI Elements */}
                            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />

                            <div className="relative z-10 text-center">
                                <div className="text-5xl font-bold text-white mb-2">POS</div>
                                <div className="text-sm text-center text-muted-foreground uppercase tracking-widest">Dashboard Preview</div>

                                <div className="mt-8 grid grid-cols-3 gap-4 w-64 opacity-50">
                                    <div className="h-12 w-full bg-white/10 rounded-lg"></div>
                                    <div className="h-12 w-full bg-white/10 rounded-lg"></div>
                                    <div className="h-12 w-full bg-white/10 rounded-lg"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/20 rounded-full blur-3xl -z-10" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10" />
                </motion.div>
            </div>
        </section>
    )
}
