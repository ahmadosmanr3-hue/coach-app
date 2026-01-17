import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Utensils } from 'lucide-react'
import { clearSession, getSession } from '../lib/session.js'

// Minimal BuilderPage to test if basic rendering works
export default function BuilderPage() {
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

  function logout() {
    clearSession()
    navigate('/', { replace: true })
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/60 flex-shrink-0">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-lg font-semibold">Workout Builder</div>
              <div className="text-xs text-slate-400">Coach code: {session?.code}</div>
            </div>
            <button
              onClick={() => navigate('/meal-planner')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm hover:bg-slate-800/50"
            >
              <Utensils className="h-4 w-4" />
              Meal Planner
            </button>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-6 flex-1">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Workout Builder</h2>
          <p className="text-slate-400">
            The builder is currently being fixed. Please use the Meal Planner in the meantime.
          </p>
          <button
            onClick={() => navigate('/meal-planner')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
          >
            Go to Meal Planner
          </button>
        </div>
      </main>
    </div>
  )
}
