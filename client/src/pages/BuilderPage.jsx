import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  Dumbbell,
  LogOut,
  Search,
  User,
  Calendar,
  Ruler,
  Weight,
  Check,
  X,
  Plus,
  FileDown,
  Utensils
} from 'lucide-react'
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
  const [workoutDayType, setWorkoutDayType] = useState('')
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [customExercises, setCustomExercises] = useState(() => {
    const stored = localStorage.getItem(`custom_exercises_${session?.code || 'default'}`)
    return stored ? JSON.parse(stored) : []
  })
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState('Chest')
  const [newExerciseImageUrl, setNewExerciseImageUrl] = useState('')



  useEffect(() => {
    const s = getSession()
    if (!s || s.role !== 'coach') {
      navigate('/', { replace: true })
      return
    }
    setSession(s)
    // Load custom exercises for this coach
    const stored = localStorage.getItem(`custom_exercises_${s.code}`)
    if (stored) {
      setCustomExercises(JSON.parse(stored))
    }
  }, [navigate])

  // Save custom exercises to localStorage whenever they change
  useEffect(() => {
    if (session?.code) {
      localStorage.setItem(`custom_exercises_${session.code}`, JSON.stringify(customExercises))
    }
  }, [customExercises, session?.code])

  const muscleGroups = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes', 'Cardio']
  const dayTypes = ['Chest Day', 'Leg Day', 'Push Day', 'Pull Day', 'Back Day', 'Full Body']

  // Merge custom exercises with built-in exercises
  const allExercises = useMemo(() => {
    return [...EXERCISES, ...customExercises]
  }, [customExercises])

  const filteredExercises = useMemo(() => {
    if (activeTab === 'All') return allExercises
    return allExercises.filter((ex) => ex.muscleGroup === activeTab)
  }, [activeTab, allExercises])

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

  function addCustomExercise() {
    if (!newExerciseName.trim()) {
      alert('Exercise name is required')
      return
    }

    const newExercise = {
      id: `custom_${Date.now()}`,
      name: newExerciseName.trim(),
      muscleGroup: newExerciseMuscleGroup,
      imageUrl: newExerciseImageUrl.trim() || 'https://placehold.co/600x400/png?text=Custom+Exercise',
      isCustom: true,
    }

    setCustomExercises((prev) => [...prev, newExercise])
    setNewExerciseName('')
    setNewExerciseMuscleGroup('Chest')
    setNewExerciseImageUrl('')
    setShowCustomModal(false)
  }

  function deleteCustomExercise(id) {
    setCustomExercises((prev) => prev.filter((ex) => ex.id !== id))
    setSelected((prev) => prev.filter((ex) => ex.id !== id))
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
      alert('Client gender is required')
      return
    }

    if (!clientAge.trim() || isNaN(clientAge) || clientAge < 1) {
      alert('Valid client age is required')
      return
    }

    if (!clientHeight.trim() || isNaN(clientHeight) || clientHeight < 1) {
      alert('Valid client height is required')
      return
    }

    if (!clientWeight.trim() || isNaN(clientWeight) || clientWeight < 1) {
      alert('Valid client weight is required')
      return
    }

    // Validate sets/reps
    const invalid = selected.find((ex) => ex.sets < 1 || ex.reps < 1)
    if (invalid) {
      alert(`Please check sets/reps for ${invalid.name}`)
      return
    }

    setSaving(true)
    try {
      // 1. Generate PDF
      const element = document.getElementById('pdf-template')
      element.style.display = 'block' // Show momentarily

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      element.style.display = 'none' // Hide again

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`${(clientName || 'workout').replaceAll(' ', '-')}.pdf`)

      // 2. Save log to DB
      const exercises_json = selected.map(ex => ({
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: ex.sets,
        reps: ex.reps,
        imageUrl: ex.imageUrl,
        isCustom: ex.isCustom
      }))

      await createWorkoutLog(session.code, {
        coach_code: session.code,
        client_name: clientName,
        client_gender: clientGender,
        client_age: Number(clientAge),
        client_height_cm: Number(clientHeight),
        client_weight_kg: Number(clientWeight),
        course_name: courseName || 'Custom Workout',
        workout_day_type: workoutDayType.trim() || null,
        exercises_json
      })

      // Reset form
      setSelected([])
      setClientName('')
      setClientGender('')
      setClientAge('')
      setClientHeight('')
      setClientWeight('')
      setCourseName('')
      setWorkoutDayType('')

      alert('Workout saved and PDF generated!')

    } catch (err) {
      console.error(err)
      alert(err?.message || 'Failed to generate')
    } finally {
      setSaving(false)
    }
  }

  function removeExercise(id) {
    setSelected((prev) => prev.filter((ex) => ex.id !== id))
  }

  const uniqueGroups = useMemo(() => {
    const groups = new Set(allExercises.map(ex => ex.muscleGroup));
    return Array.from(groups).sort();
  }, [allExercises]);


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Floating Scroll to Generate Button - Removed */}
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Exercise Library</h2>
                <p className="text-xs text-slate-400">Click to add/remove exercises</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/50 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-800/50"
                >
                  <Plus className="h-4 w-4" />
                  Add Custom
                </button>
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
            <div className="space-y-2 mb-4">
              <label className="text-xs font-medium text-slate-300 mb-1 block">Course Name</label>
              <input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                placeholder="e.g. Advanced Program"
              />
            </div>

            {/* Client Details */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-6">
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
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-2">
                  <Dumbbell className="h-3.5 w-3.5" />
                  Workout Day Type
                </label>
                <select
                  value={workoutDayType}
                  onChange={(e) => setWorkoutDayType(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                >
                  <option value="">Select (Optional)</option>
                  {dayTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Muscle Group Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
              {muscleGroups.map((group) => (
                <button
                  key={group}
                  onClick={() => setActiveTab(group)}
                  className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === group
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                  {group}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {filteredExercises.map((ex) => {
                const active = selectedIds.has(ex.id)
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => toggleExercise(ex)}
                    className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-200 ${active ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/20' : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/60'
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
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all ${active ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-200'
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

              <div className="mt-4 rounded-xl bg-white p-6 text-slate-900"> {/* Removed ref={targetRef} */}
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
                            <input
                              type="number"
                              min="1"
                              value={ex.sets ?? 3}
                              onChange={(e) => updateExerciseDetail(ex.id, 'sets', parseInt(e.target.value) || 1)}
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
                            />
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-600 mb-1">Reps</div>
                            <input
                              type="number"
                              min="1"
                              value={ex.reps ?? 10}
                              onChange={(e) => updateExerciseDetail(ex.id, 'reps', parseInt(e.target.value) || 1)}
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
                            />
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

      {/* Hidden PDF Template */}
      <div
        id="pdf-template"
        style={{ display: 'none', width: '210mm', minHeight: '297mm', padding: '15mm', backgroundColor: 'white', color: '#1e293b' }}
      >
        {/* Header */}
        <div className="border-b-2 border-indigo-600 pb-6 mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{courseName || 'Custom Workout'}</h1>
            <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Coach: {session?.coachName || session?.code}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{clientName || 'Client'}</div>
            <div className="text-sm text-slate-500 mt-1">
              {clientGender && <span className="mr-2">{clientGender}</span>}
              {clientAge && <span className="mr-2">• {clientAge} yrs</span>}
              {clientHeight && <span className="mr-2">• {clientHeight}cm</span>}
              {clientWeight && <span>• {clientWeight}kg</span>}
            </div>
          </div>
        </div>

        {/* Exercises Grid */}
        <div className="grid grid-cols-1 gap-6">
          {selected.map((ex, idx) => (
            <div key={ex.id} className="flex items-start gap-6 p-4 rounded-xl bg-slate-50 border border-slate-100 break-inside-avoid">
              {/* Image */}
              <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-white shadow-sm border border-slate-200">
                <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover" />
              </div>

              {/* Details */}
              <div className="flex-1 pt-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      <span className="text-indigo-500 mr-2">{idx + 1}.</span>
                      {ex.name}
                    </h3>
                    <div className="text-sm font-medium text-slate-400 uppercase tracking-wide mt-1">{ex.muscleGroup}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-8">
                  <div className="bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-sm text-center min-w-[100px]">
                    <div className="text-2xl font-bold text-indigo-600">{ex.sets}</div>
                    <div className="text-xs font-semibold text-slate-400 uppercase">Sets</div>
                  </div>
                  <div className="bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-sm text-center min-w-[100px]">
                    <div className="text-2xl font-bold text-indigo-600">{ex.reps}</div>
                    <div className="text-xs font-semibold text-slate-400 uppercase">Reps</div>
                  </div>
                  <div className="flex-1 bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-sm min-h-[70px]">
                    <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</div>
                    <div className="text-sm text-slate-300 italic">Write weights here...</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          Generated by Coach App • {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Custom Exercise Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowCustomModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-4 text-xl font-bold text-slate-100">Add Custom Exercise</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Exercise Name *
                </label>
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  placeholder="e.g., Farmer's Walk"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Muscle Group *
                </label>
                <select
                  value={newExerciseMuscleGroup}
                  onChange={(e) => setNewExerciseMuscleGroup(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                >
                  <option value="Chest">Chest</option>
                  <option value="Back">Back</option>
                  <option value="Legs">Legs</option>
                  <option value="Shoulders">Shoulders</option>
                  <option value="Arms">Arms</option>
                  <option value="Core">Core</option>
                  <option value="Glutes">Glutes</option>
                  <option value="Cardio">Cardio</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={newExerciseImageUrl}
                  onChange={(e) => setNewExerciseImageUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={addCustomExercise}
                  className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
                >
                  Add Exercise
                </button>
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
