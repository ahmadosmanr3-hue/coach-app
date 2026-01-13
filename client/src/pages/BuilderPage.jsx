import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePDF } from 'react-to-pdf'
import { FileDown, LogOut, Plus, Trash2, CheckSquare, User, Calendar, Ruler, Weight } from 'lucide-react'
import { EXERCISES } from '../data/exercises.js'
import { createWorkoutLog } from '../lib/api.js'
import { clearSession, getSession } from '../lib/session.js'

export default function BuilderPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => getSession())
  const [clientName, setClientName] = useState('')
  const [clientGender, setClientGender] = useState('')
  const [clientAge, setClientAge] = useState('')
  const [clientHeight, setClientHeight] = useState('')
  const [clientWeight, setClientWeight] = useState('')
  const [courseName, setCourseName] = useState('')
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [activeTab, setActiveTab] = useState('All')

  const { toPDF, targetRef } = usePDF({
    filename: `${(clientName || 'workout').replaceAll(' ', '-')}.pdf`,
  })

  useEffect(() => {
    const s = getSession()
    if (!s || s.role !== 'coach') {
      navigate('/', { replace: true })
      return
    }
    setSession(s)
  }, [navigate])

  const muscleGroups = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes']

  const filteredExercises = useMemo(() => {
    if (activeTab === 'All') return EXERCISES
    return EXERCISES.filter((ex) => ex.muscleGroup === activeTab)
  }, [activeTab])

  const selectedIds = useMemo(() => new Set(selected.map((e) => e.id)), [selected])
  const selectedByTab = useMemo(() => {
    if (activeTab === 'All') return selected
    return selected.filter((ex) => ex.muscleGroup === activeTab)
  }, [selected, activeTab])

  function toggleExercise(exercise) {
    setSelected((prev) => {
      const exists = prev.some((x) => x.id === exercise.id)
      if (exists) return prev.filter((x) => x.id !== exercise.id)
      return [...prev, { ...exercise, sets: 3, reps: 10 }]
    })
  }

  function selectAll() {
    setSelected(filteredExercises.map((ex) => ({ ...ex, sets: 3, reps: 10 })))
  }

  function scrollToGenerate() {
    document.getElementById('generate-pdf-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  function clearAll() {
    setSelected([])
  }

  function updateExerciseDetail(id, field, value) {
    setSelected((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    )
  }

  function logout() {
    clearSession()
    navigate('/', { replace: true })
  }

  async function generateAndSave() {
    setStatus('')

    if (!session?.code) {
      setStatus('Missing session')
      return
    }

    if (!clientName.trim()) {
      setStatus('Client name is required')
      return
    }

    if (!clientGender.trim()) {
      setStatus('Client gender is required')
      return
    }

    if (!clientAge.trim() || isNaN(clientAge) || clientAge < 1) {
      setStatus('Valid client age is required')
      return
    }

    if (!clientHeight.trim() || isNaN(clientHeight) || clientHeight < 1) {
      setStatus('Valid client height is required')
      return
    }

    if (!clientWeight.trim() || isNaN(clientWeight) || clientWeight < 1) {
      setStatus('Valid client weight is required')
      return
    }

    if (!courseName.trim()) {
      setStatus('Course name is required')
      return
    }

    if (selected.length === 0) {
      setStatus('Select at least one exercise')
      return
    }

    setSaving(true)
    try {
      await toPDF()

      await createWorkoutLog(session.code, {
        coach_code: session.code,
        client_name: clientName.trim(),
        client_gender: clientGender.trim(),
        client_age: Number(clientAge),
        client_height_cm: Number(clientHeight),
        client_weight_kg: Number(clientWeight),
        exercises_json: selected,
        course_name: courseName.trim(),
      })

      setStatus('Saved workout log')
      // Clear form and selections for next workout
      setClientName('')
      setClientGender('')
      setClientAge('')
      setClientHeight('')
      setClientWeight('')
      setCourseName('')
      setSelected([])
    } catch (err) {
      setStatus(err?.message || 'Failed to generate/save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Floating Scroll to Generate Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={scrollToGenerate}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          <FileDown className="h-4 w-4" />
          Scroll to Generate
        </button>
      </div>
      <header className="border-b border-slate-800 bg-slate-950/60 flex-shrink-0">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold">Workout Builder</div>
            <div className="text-xs text-slate-400">Coach code: {session?.code}</div>
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Exercise Library</h2>
                <p className="text-xs text-slate-400">Click to add/remove exercises</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm"
                >
                  <CheckSquare className="h-4 w-4" />
                  Select All
                </button>
              </div>
            </div>

            {/* Course Name */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 mb-1 block">Course Name</label>
              <input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                placeholder="e.g. Advanced Program"
              />
            </div>

            {/* Muscle Group Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
              {muscleGroups.map((group) => (
                <button
                  key={group}
                  onClick={() => setActiveTab(group)}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                    activeTab === group
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Client Name
                </label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  placeholder="e.g. Alex"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Gender
                </label>
                <select
                  value={clientGender}
                  onChange={(e) => setClientGender(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Age
                </label>
                <input
                  value={clientAge}
                  onChange={(e) => setClientAge(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  placeholder="e.g. 28"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-2">
                  <Ruler className="h-3.5 w-3.5" />
                  Height (cm)
                </label>
                <input
                  value={clientHeight}
                  onChange={(e) => setClientHeight(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  placeholder="e.g. 175"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-2">
                  <Weight className="h-3.5 w-3.5" />
                  Weight (kg)
                </label>
                <input
                  value={clientWeight}
                  onChange={(e) => setClientWeight(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  placeholder="e.g. 72"
                  type="number"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {filteredExercises.map((ex) => {
                const active = selectedIds.has(ex.id)
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => toggleExercise(ex)}
                    className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
                      active ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/20' : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        alt={ex.name}
                        src={ex.imageUrl}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/95 via-slate-900/70 to-transparent p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm text-white drop-shadow">{ex.name}</div>
                          <div className="text-xs text-slate-300">{ex.muscleGroup}</div>
                        </div>
                        <div
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                            active ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          {active ? (
                            <>
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              Add
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-1" id="generate-pdf-section">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">Workout Plan</h2>
                  <p className="text-xs text-slate-400">This section is exported to PDF</p>
                </div>
                <button
                  onClick={generateAndSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  {saving ? 'Working...' : 'Generate & Save PDF'}
                </button>
              </div>

              {status ? <div className="mt-3 text-xs text-slate-300">{status}</div> : null}

              <div ref={targetRef} className="mt-4 rounded-xl bg-white p-6 text-slate-900">
                <div className="mb-6 border-b border-slate-200 pb-4">
                  <div className="text-2xl font-bold">Workout Plan</div>
                  <div className="mt-1 text-sm font-medium">Client: {clientName || '—'}</div>
                  <div className="mt-2 text-xs text-slate-500 leading-relaxed">
                    {clientGender && <span>Gender: {clientGender}</span>}
                    {clientGender && clientAge && ' | '}
                    {clientAge && <span>Age: {clientAge}</span>}
                    {(clientGender || clientAge) && clientHeight && ' | '}
                    {clientHeight && <span>Height: {clientHeight} cm</span>}
                    {(clientGender || clientAge || clientHeight) && clientWeight && ' | '}
                    {clientWeight && <span>Weight: {clientWeight} kg</span>}
                  </div>
                  <div className="mt-3 text-right text-xs text-slate-400">
                    Coach: {session?.coachName || session?.code}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {selectedByTab.length === 0 ? (
                    <div className="text-sm text-slate-500">No exercises selected yet.</div>
                  ) : (
                    selectedByTab.map((ex, idx) => (
                      <div key={ex.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="mb-3">
                          <div className="text-base font-semibold">
                            {idx + 1}. {ex.name}
                          </div>
                          <div className="text-xs text-slate-500">{ex.muscleGroup}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <div>
                            <div className="text-xs font-medium text-slate-600 mb-1">Sets</div>
                            <div className="text-sm font-semibold">{ex.sets ?? 3}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-600 mb-1">Reps</div>
                            <div className="text-sm font-semibold">{ex.reps ?? 10}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Saving also creates a record in <span className="text-slate-300">workout_logs</span> tagged to your coach
                code.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
