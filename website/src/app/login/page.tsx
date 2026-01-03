'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Loader2, Terminal, ArrowLeft } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            await signInWithEmailAndPassword(auth, email, password)
            router.push('/dashboard')
        } catch (err: any) {
            setError('Invalid email or password.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />

            <div className="relative z-10 glass p-8 md:p-12 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl">
                <Link href="/" className="absolute top-6 left-6 text-muted-foreground hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-xl mb-4">
                        <Terminal size={24} />
                    </div>
                    <h1 className="text-2xl font-bold">Welcome back</h1>
                    <p className="text-muted-foreground">Sign in to manage your account</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Email</label>
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
                        <div className="flex justify-between mb-1.5">
                            <label className="block text-sm font-medium text-muted-foreground">Password</label>
                            <Link href="#" className="text-xs text-accent hover:underline">Forgot password?</Link>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link href="/#download" className="text-accent hover:underline font-medium">
                        Download & Register
                    </Link>
                </div>
            </div>
        </div>
    )
}
