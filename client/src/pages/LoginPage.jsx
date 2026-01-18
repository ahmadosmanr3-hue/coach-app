import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { loginWithCode } from '../lib/api.js'
import { getSession, setSession } from '../lib/session.js'

function normalizeCode(code) {
  return code.trim()
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Auto-redirect if session already exists
  useMemo(() => {
    const s = getSession()
    if (s) {
      if (s.role === 'admin') navigate('/admin', { replace: true })
      else if (s.role === 'coach') navigate('/builder', { replace: true })
    }
  }, [navigate])

  const canSubmit = useMemo(() => normalizeCode(code).length > 0 && !loading, [code, loading])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    const cleaned = normalizeCode(code)

    if (cleaned === 'ADMIN-99') {
      setSession({ role: 'admin', code: 'ADMIN-99' })
      navigate('/admin', { replace: true })
      return
    }

    setLoading(true)
    try {
      const result = await loginWithCode(cleaned)
      if (result?.role !== 'coach') {
        throw new Error('Invalid access code')
      }

      setSession({ role: 'coach', code: result.code, coachName: result.coach_name || '' })
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Coach Builder</h1>
              <p className="text-sm text-slate-400">Enter your access code to continue</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-200">Access Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-600 focus:border-slate-600"
              />
            </div>

            {error ? <div className="text-sm text-red-400">{error}</div> : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>

            <div className="text-xs text-slate-500">
              Admin code routes to <span className="text-slate-300">/admin</span>. Coach codes route to{' '}
              <span className="text-slate-300">/builder</span>.
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
