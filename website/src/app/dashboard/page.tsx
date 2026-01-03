'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { Loader2, LogOut, CreditCard, ShieldCheck, User, Terminal, CheckCircle, Mail, Hash } from 'lucide-react'

interface UserData {
    email: string
    plan: 'free' | 'pro' | 'enterprise'
    subscriptionStatus: string
    createdAt: any
    businessName?: string
}

export default function Dashboard() {
    const [user, setUser] = useState<any>(null)
    const [userData, setUserData] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/login')
                return
            }
            setUser(currentUser)

            // Fetch user data
            try {
                const docRef = doc(db, "users", currentUser.uid)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    setUserData(docSnap.data() as UserData)
                }
            } catch (err) {
                console.error("Error fetching user data:", err)
            } finally {
                setLoading(false)
            }
        })
        return () => unsubscribe()
    }, [router])

    const handleLogout = async () => {
        await signOut(auth)
        router.push('/')
    }

    const handleManageSubscription = () => {
        alert("Redirecting to Lemon Squeezy Customer Portal... (Integration Placeholder)")
    }

    const getPlanFeatures = (plan: string = 'free') => {
        const features = {
            'free': ["1 Register", "100 Products", "Basic Reporting", "Email Support"],
            'pro': ["3 Registers", "Unlimited Products", "Advanced Analytics", "Priority Support"],
            'enterprise': ["Unlimited Registers", "Multi-store Sync", "API Access", "Dedicated Account Manager"]
        }
        return features[plan as keyof typeof features] || features['free']
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center text-white">
                <Loader2 className="animate-spin w-8 h-8" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <nav className="border-b border-white/10 glass sticky top-0 z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                            <Terminal size={18} />
                        </div>
                        <span className="font-bold text-lg hidden md:block">POS Dashboard</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
                        <button
                            onClick={handleLogout}
                            className="text-sm flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors border border-white/5"
                        >
                            <LogOut size={16} />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 container mx-auto px-6 py-8 md:py-12">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Welcome Section */}
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">
                            Welcome back
                            {userData?.businessName && <span className="text-accent">, {userData.businessName}</span>}
                        </h1>
                        <p className="text-muted-foreground text-lg">Manage your commercial license and billing.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                        {/* Plan Card */}
                        <div className="glass p-6 md:p-8 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col h-full">
                            <div className="absolute top-0 right-0 p-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold leading-tight">Current Plan</h3>
                                        <p className="text-xs text-accent uppercase tracking-wide font-bold">{userData?.plan || 'Free'}</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20 uppercase tracking-wider flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    {userData?.subscriptionStatus || 'Active'}
                                </span>
                            </div>

                            <div className="space-y-4 mb-8 flex-1 relative z-10">
                                <div className="text-sm text-muted-foreground mb-4">Plan Features:</div>
                                {getPlanFeatures(userData?.plan).map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm group">
                                        <CheckCircle className="w-4 h-4 text-zinc-600 group-hover:text-accent transition-colors" />
                                        <span className="text-zinc-300">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleManageSubscription}
                                className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 cursor-pointer relative z-10"
                            >
                                <CreditCard size={18} /> Manage Subscription
                            </button>
                        </div>

                        {/* Profile Card */}
                        <div className="glass p-6 md:p-8 rounded-2xl border border-white/10 h-full">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                    <User size={20} />
                                </div>
                                <h3 className="text-lg font-bold">Profile Details</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Email Address</label>
                                    <div className="bg-black/40 border border-white/5 rounded-lg p-3 flex items-center gap-3 text-white">
                                        <Mail size={16} className="text-zinc-500" />
                                        {user?.email}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">License ID</label>
                                    <div className="bg-black/40 border border-white/5 rounded-lg p-3 flex items-center gap-3 text-zinc-400 font-mono text-xs overflow-hidden">
                                        <Hash size={16} className="text-zinc-500 shrink-0" />
                                        <span className="truncate">{user?.uid}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <div className="flex justify-between text-sm py-2">
                                        <span className="text-muted-foreground">Member Since</span>
                                        <span className="text-white font-medium">
                                            {userData?.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Today'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
