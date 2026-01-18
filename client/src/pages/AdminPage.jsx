import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, RefreshCcw, Trash2 } from 'lucide-react'
import { listWorkoutLogs, deleteAllWorkoutLogs } from '../lib/api.js'
import { clearSession, getSession } from '../lib/session.js'

export default function AdminPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => getSession())
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetting, setResetting] = useState(false)

  const logsByCoach = useMemo(() => {
    const grouped = {}
    logs.forEach((row) => {
      const coach = row.coach_code || 'Unknown'
      if (!grouped[coach]) grouped[coach] = { workouts: [], mealPlans: [] }

      const isMealPlan = row.course_name?.startsWith('[MEAL PLAN]') ||
        (Array.isArray(row.exercises_json) && row.exercises_json[0]?.id === 'meal-plan')

      if (isMealPlan) {
        grouped[coach].mealPlans.push(row)
      } else {
        grouped[coach].workouts.push(row)
      }
    })
    return grouped
  }, [logs])

  const coachSummaries = useMemo(() => {
    return Object.entries(logsByCoach).map(([coachCode, { workouts, mealPlans }]) => {
      const allLogs = [...workouts, ...mealPlans]
      return {
        coachCode,
        workouts: allLogs.length,
        commission: allLogs.reduce((sum, row) => sum + (row.commission_amount || 0), 0),
      }
    })
  }, [logsByCoach])

  const totalCommissionOwed = useMemo(() => logs.reduce((sum, row) => sum + (row.commission_amount || 0), 0), [logs])

  useEffect(() => {
    const s = getSession()
    if (!s || s.role !== 'admin' || s.code !== 'ADMIN-99') {
      navigate('/', { replace: true })
      return
    }
    setSession(s)
  }, [navigate])

  const load = useCallback(async () => {
    setError('')
    if (!session?.code) return

    setLoading(true)
    try {
      const data = await listWorkoutLogs(session.code)
      setLogs(Array.isArray(data) ? data : data?.rows || [])
    } catch (err) {
      setError(err?.message || 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [session?.code])

  useEffect(() => {
    load()
  }, [load])

  function logout() {
    clearSession()
    navigate('/', { replace: true })
  }

  async function handleResetAll() {
    if (!confirm('Are you sure? This will permanently delete all workout logs and reset commissions.')) return
    setResetting(true)
    setError('')
    try {
      await deleteAllWorkoutLogs(session.code)
      setLogs([])
    } catch (err) {
      setError(err?.message || 'Failed to reset')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold">Admin Dashboard</div>
            <div className="text-xs text-slate-400">Protected by ADMIN-99</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAll}
              disabled={resetting || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-red-800 bg-red-900/50 px-3 py-2 text-sm text-red-200 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {resetting ? 'Resetting…' : 'Reset All'}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm disabled:opacity-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-6">
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {error && (
            <div className="rounded-2xl border border-red-800 bg-red-900/20 p-4 text-red-200 md:col-span-2 lg:col-span-3">
              Error: {error}
            </div>
          )}
          {coachSummaries.map(({ coachCode, workouts, commission }) => (
            <div key={coachCode} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-xs text-slate-400">{coachCode === 'COACH-123' ? 'Nasr Akram' : coachCode}</div>
              <div className="mt-2 text-2xl font-semibold">{workouts}</div>
              <div className="text-xs text-slate-500">workout{workouts !== 1 ? 's' : ''}</div>
              <div className="mt-2 text-lg font-semibold text-green-400">${commission}</div>
              <div className="text-xs text-slate-500">commission</div>
            </div>
          ))}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:col-span-2 lg:col-span-3">
            <div className="text-xs text-slate-400">Total Across All Coaches</div>
            <div className="text-lg font-semibold">{coachSummaries.reduce((sum, s) => sum + s.workouts, 0)} workouts</div>
            <div className="text-lg font-semibold text-green-400">{coachSummaries.reduce((sum, s) => sum + s.commission, 0)} IQD</div>
            <div className="text-xs text-slate-500">total commission</div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
          <div className="bg-slate-900/40 px-4 py-3 text-sm font-semibold">Workout Logs by Coach</div>
          <div className="divide-y divide-slate-800">
            {Object.keys(logsByCoach).length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-400">No logs found.</div>
            ) : (
              Object.entries(logsByCoach).map(([coachCode, { workouts, mealPlans }]) => (
                <div key={coachCode} className="px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">Coach: {coachCode === 'COACH-123' ? 'Nasr Akram' : coachCode}</div>
                    <div className="text-xs text-slate-500">
                      {workouts.length} workout{workouts.length !== 1 ? 's' : ''}, {mealPlans.length} meal plan{mealPlans.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* WORKOUTS SECTION */}
                  {workouts.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">Workouts</div>
                      <div className="space-y-2">
                        {workouts.map((row) => (
                          <div key={row.id} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-700 bg-slate-900/20 px-3 py-2 md:grid-cols-6">
                            <div>
                              <div className="text-xs text-slate-500">Created</div>
                              <div className="text-sm">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Course / Plan</div>
                              <div className="text-sm font-medium text-slate-200">{row.course_name || '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Client</div>
                              <div className="text-sm">{row.client_name || '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Gender</div>
                              <div className="text-sm">{row.client_gender || '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Age / H / W</div>
                              <div className="text-sm">
                                {row.client_age ? `${row.client_age}y` : '—'}
                                {row.client_height_cm ? ` / ${row.client_height_cm}cm` : ''}
                                {row.client_weight_kg ? ` / ${row.client_weight_kg}kg` : ''}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Exercises</div>
                              <div className="text-sm">
                                {Array.isArray(row.exercises_json) ? row.exercises_json.length : row.exercises_json ? '1+' : '0'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MEAL PLANS SECTION */}
                  {mealPlans.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">Meal Plans</div>
                      <div className="space-y-2">
                        {mealPlans.map((row) => (
                          <div key={row.id} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-700 bg-slate-900/20 px-3 py-2 md:grid-cols-5">
                            <div>
                              <div className="text-xs text-slate-500">Created</div>
                              <div className="text-sm">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</div>
                            </div>
                            <div className="md:col-span-2">
                              <div className="text-xs text-slate-500">Plan Name</div>
                              <div className="text-sm font-medium text-emerald-200">{row.course_name.replace('[MEAL PLAN] ', '') || '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Client</div>
                              <div className="text-sm">{row.client_name || '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Details</div>
                              <div className="text-sm text-slate-400">
                                {row.client_gender}, {row.client_age}y
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
