import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, ArrowRight } from 'lucide-react'
import { getSession } from '../lib/session.js'

export default function OnboardingPage() {
    const navigate = useNavigate()
    const [session, setSession] = useState(null)

    useEffect(() => {
        const s = getSession()
        if (!s || s.role !== 'coach') {
            navigate('/', { replace: true })
            return
        }
        setSession(s)
    }, [navigate])

    if (!session) return null

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8">

                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20">
                        <Dumbbell className="w-10 h-10 text-indigo-400" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome, Coach!</h1>
                    <p className="text-slate-400">
                        Ready to build some workout plans?
                    </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-left space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Coach Code</span>
                        <span className="font-mono font-medium bg-slate-800 px-2 py-1 rounded text-slate-300">{session.code}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Role</span>
                        <span className="font-medium text-indigo-400 capitalize">{session.role}</span>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/builder')}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group"
                >
                    Get Started
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

            </div>
        </div>
    )
}
