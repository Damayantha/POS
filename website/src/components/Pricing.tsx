'use client'

import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

const plans = [
    {
        name: "Starter",
        price: 0,
        description: "Perfect for small shops just starting out.",
        features: ["1 Register", "100 Products", "Basic Reporting", "Email Support"]
    },
    {
        name: "Pro",
        price: 29,
        description: "For growing businesses with multiple staff.",
        features: ["3 Registers", "Unlimited Products", "Advanced Analytics", "Inventory Management", "Priority Support"],
        popular: true
    },
    {
        name: "Enterprise",
        price: 99,
        description: "Custom solutions for large chains.",
        features: ["Unlimited Registers", "Multi-store Sync", "API Access", "Dedicated Account Manager", "Custom Integrations"]
    }
]

export function Pricing() {
    const [isYearly, setIsYearly] = useState(false)

    return (
        <section id="pricing" className="py-24 relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
                    <p className="text-muted-foreground text-lg mb-8">
                        Choose the plan that fits your business stage.
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <span className={!isYearly ? "text-white" : "text-muted-foreground"}>Monthly</span>
                        <button
                            onClick={() => setIsYearly(!isYearly)}
                            className="w-14 h-8 bg-accent/20 rounded-full relative p-1 transition-colors cursor-pointer"
                        >
                            <div className={`w-6 h-6 bg-accent rounded-full absolute top-1 transition-all ${isYearly ? 'left-7' : 'left-1'}`} />
                        </button>
                        <span className={isYearly ? "text-white" : "text-muted-foreground"}>Yearly <span className="text-xs text-accent">(Save 20%)</span></span>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => {
                        const price = isYearly ? Math.round(plan.price * 12 * 0.8) : plan.price
                        const period = isYearly ? '/yr' : '/mo'

                        return (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={`relative p-8 rounded-2xl border ${plan.popular ? 'glass border-accent/50 shadow-2xl shadow-accent/10' : 'bg-card/20 border-white/5'}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-1 rounded-full text-sm font-bold">
                                        Most Popular
                                    </div>
                                )}

                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <div className="mb-4">
                                    <span className="text-4xl font-bold">${price}</span>
                                    <span className="text-muted-foreground">{period}</span>
                                </div>
                                <p className="text-muted-foreground mb-8 text-sm">{plan.description}</p>

                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3 text-sm">
                                            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shrink-0">
                                                <Check size={12} />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button className={`w-full py-3 rounded-lg font-bold transition-all cursor-pointer ${plan.popular ? 'bg-accent text-white hover:bg-accent/90' : 'bg-white/10 hover:bg-white/20'}`}>
                                    Choose {plan.name}
                                </button>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
