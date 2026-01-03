'use client'

import { motion } from 'framer-motion'
import { WifiOff, BarChart3, Users, Zap, Shield, Smartphone } from 'lucide-react'

const features = [
    {
        icon: <WifiOff className="w-6 h-6" />,
        title: "Offline First",
        description: "Keep selling even when the internet goes down. Data syncs automatically when you reconnect."
    },
    {
        icon: <BarChart3 className="w-6 h-6" />,
        title: "Real-time Analytics",
        description: "Track sales, inventory trends, and employee performance with detailed dashboards."
    },
    {
        icon: <Zap className="w-6 h-6" />,
        title: "Lightning Fast",
        description: "Built with native technologies for instant response times. No loading spinners."
    },
    {
        icon: <Users className="w-6 h-6" />,
        title: "Team Management",
        description: "Granular permissions, shift tracking, and performance metrics for your staff."
    },
    {
        icon: <Shield className="w-6 h-6" />,
        title: "Secure & Local",
        description: "Your data lives on your device first. Enterprise-grade encryption keeps it safe."
    },
    {
        icon: <Smartphone className="w-6 h-6" />,
        title: "Multi-Platform",
        description: "Access your dashboard from anywhere. Windows app for the counter, Web for analysis."
    }
]

export function Features() {
    return (
        <section id="features" className="py-24 bg-card/30 relative">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to run your store</h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Powerful features wrapped in a simple, intuitive interface. Designed for modern retail.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="glass p-8 rounded-2xl hover:bg-white/5 transition-colors border border-white/5"
                        >
                            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center text-accent mb-6">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
