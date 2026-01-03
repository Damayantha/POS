'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Download', href: '#download' },
    ]

    return (
        <nav
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
                isScrolled ? 'glass py-4' : 'bg-transparent py-6'
            )}
        >
            <div className="container mx-auto px-6 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg group-hover:scale-110 transition-transform">
                        <Terminal size={20} />
                    </div>
                    <span className="font-bold text-xl tracking-tight">POSbyCirvex</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-muted-foreground hover:text-white transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <Link
                        href="/login"
                        className="text-sm font-medium hover:text-white transition-colors"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="#download"
                        className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-bold hover:bg-white/90 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        Get Started
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden text-muted-foreground hover:text-white"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-full left-0 right-0 glass border-t border-border p-6 md:hidden flex flex-col gap-4"
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-lg font-medium text-muted-foreground hover:text-white"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <hr className="border-border my-2" />
                        <Link
                            href="/login"
                            className="text-lg font-medium text-muted-foreground hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Sign In
                        </Link>
                        <Link
                            href="#download"
                            onClick={() => setMobileMenuOpen(false)}
                            className="bg-primary text-primary-foreground px-5 py-3 rounded-lg text-center font-bold"
                        >
                            Get Started
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
