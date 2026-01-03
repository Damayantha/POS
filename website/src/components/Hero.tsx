'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export function Hero() {
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
                        v1.0 Now Available
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
                        Modern POS for <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-gray-500">
                            Smart Business
                        </span>
                    </h1>

                    <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                        Experience the future of point-of-sale systems. Offline-first, reliable, and designed for speed.
                        Manage inventory, sales, and customers with a production-ready Windows application.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 mb-12">
                        <Link
                            href="#download"
                            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-lg hover:bg-white/90 transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        >
                            Download for Windows
                            <ArrowRight size={20} />
                        </Link>
                        <Link
                            href="#features"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg border border-border hover:bg-white/5 transition-all text-foreground"
                        >
                            View Features
                        </Link>
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
