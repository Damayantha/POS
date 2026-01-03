import Link from 'next/link'
import { Terminal } from 'lucide-react'

export function Footer() {
    return (
        <footer className="bg-card border-t border-white/5 py-12">
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-white text-black p-1.5 rounded-lg">
                                <Terminal size={16} />
                            </div>
                            <span className="font-bold text-lg tracking-tight">POSbyCirvex</span>
                        </div>
                        <p className="text-muted-foreground max-w-sm">
                            Next-generation point of sale software for forward-thinking retailers.
                            Built for speed, reliability, and scale.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#features" className="hover:text-white">Features</Link></li>
                            <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
                            <li><Link href="#download" className="hover:text-white">Download</Link></li>
                            <li><Link href="#" className="hover:text-white">Changelog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
                            <li><Link href="#" className="hover:text-white">Terms of Service</Link></li>
                            <li><Link href="#" className="hover:text-white">License</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} POSbyCirvex. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
