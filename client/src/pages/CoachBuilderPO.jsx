import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  Dumbbell,
  LogOut,
  User,
  Calendar,
  Ruler,
  Weight,
  X,
  Plus,
  FileDown,
  Utensils,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check
} from 'lucide-react'
import { EXERCISES } from '../data/exercises.js'
import { createWorkoutLog } from '../lib/api.js'
import { clearSession, getSession } from '../lib/session.js'

export default function BuilderPage() {
  // Force Rebuild 1
  const navigate = useNavigate()
  const pdfRef = useRef(null) // Ref for the PDF generation target

  // --- STATE ---
  const [session, setSession] = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const [loading, setLoading] = useState(true)

  // Client Details
  const [client, setClient] = useState({
    name: '',
    gender: '',
    age: '',
    height: '',
    weight: ''
  })
  const [courseName, setCourseName] = useState('')
  const [workoutDay, setWorkoutDay] = useState('Chest Day')

  // Exercises
  const [selected, setSelected] = useState([]) // Array of exercise objects with sets/reps
  const [customExercises, setCustomExercises] = useState([])

  // UI State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
  const [newCustom, setNewCustom] = useState({ name: '', muscleGroup: 'Chest' })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  // --- EFFECTS ---

  // 1. Check Session
  useEffect(() => {
    const s = getSession()
    if (!s || s.role !== 'coach') {
      navigate('/', { replace: true })
      return
    }
    // Override coach name for COACH-123 as requested
    if (s.code === 'COACH-123') {
      s.coachName = 'Nasr Akram'
    }
    setSession(s)
    setLoading(false)
  }, [navigate])

  // 2. Load Custom Exercises
  useEffect(() => {
    if (session?.code) {
      const stored = localStorage.getItem(`custom_exercises_${session.code}`)
      if (stored) {
        try {
          setCustomExercises(JSON.parse(stored))
        } catch (e) {
          console.error("Failed to parse custom exercises", e)
        }
      }
    }
  }, [session])

  // 3. Save Custom Exercises
  useEffect(() => {
    if (session?.code) {
      localStorage.setItem(`custom_exercises_${session.code}`, JSON.stringify(customExercises))
    }
  }, [customExercises, session])

  // --- LOGIC ---

  const muscleGroups = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes', 'Cardio']
  const dayTypes = ['Chest Day', 'Leg Day', 'Push Day', 'Pull Day', 'Back Day', 'Full Body', 'Cardio Day', 'Rest Day']

  const allExercises = useMemo(() => [...EXERCISES, ...customExercises], [customExercises])

  const filteredExercises = useMemo(() => {
    if (activeTab === 'All') return allExercises
    return allExercises.filter(e => e.muscleGroup === activeTab)
  }, [activeTab, allExercises])

  function toggleExercise(exercise) {
    setSelected(prev => {
      const exists = prev.find(e => e.id === exercise.id)
      if (exists) {
        return prev.filter(e => e.id !== exercise.id)
      }
      return [...prev, { ...exercise, sets: 3, reps: 10 }]
    })
  }

  function updateExerciseDetails(id, field, value) {
    setSelected(prev => prev.map(e => {
      if (e.id === id) return { ...e, [field]: value }
      return e
    }))
  }

  function handleAddCustom() {
    if (!newCustom.name) return
    const exercise = {
      id: `custom-${Date.now()}`,
      name: newCustom.name,
      muscleGroup: newCustom.muscleGroup,
      imageUrl: 'https://placehold.co/600x400/png?text=Custom',
      isCustom: true
    }
    setCustomExercises(prev => [...prev, exercise])
    setNewCustom({ name: '', muscleGroup: 'Chest' })
    setIsCustomModalOpen(false)
  }

  function deleteCustomExercise(id, e) {
    e.stopPropagation()
    if (confirm('Delete this custom exercise?')) {
      setCustomExercises(prev => prev.filter(x => x.id !== id))
      setSelected(prev => prev.filter(x => x.id !== id))
    }
  }

  function scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function generateAndSave() {
    setStatus('')
    if (!client.name || !courseName) {
      setStatus('Client Name and Course Name are required.')
      return
    }
    if (selected.length === 0) {
      setStatus('Please select at least one exercise.')
      return
    }

    setSaving(true)
    try {
      // 1. Generate PDF using Cloning Technique (Robust against "Wrong PNG signature")
      const element = pdfRef.current

      // Clone the element
      const clone = element.cloneNode(true)

      // Style the clone to be visible but off-screen
      clone.style.display = 'block'
      clone.style.position = 'fixed'
      clone.style.left = '-9999px'
      clone.style.top = '0'
      clone.style.width = '210mm' // Enforce A4 width
      clone.style.zIndex = '-9999'

      // Append to body
      document.body.appendChild(clone)

      // Render the clone
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1000 // Ensure enough width
      })

      // Remove the clone
      document.body.removeChild(clone)

      const imgData = canvas.toDataURL('image/png')

      // Check if image data is valid
      if (imgData === 'data:,') {
        throw new Error('Failed to generate image from view.')
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`${client.name.replace(/\s+/g, '-')}-workout.pdf`)

      // 2. Save to Supabase
      await createWorkoutLog(session.code, {
        coach_code: session.code,
        client_name: client.name,
        client_gender: client.gender,
        client_age: Number(client.age) || null,
        client_height_cm: Number(client.height) || null,
        client_weight_kg: Number(client.weight) || null,
        course_name: `${courseName} - ${workoutDay}`,
        exercises_json: selected
      })

      setStatus('Success! PDF downloaded and Log saved.')

      // Reset Optional
      // setSelected([])
      // setClient({...})

    } catch (err) {
      console.error(err)
      setStatus(err.message || 'Failed to generate/save')
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    clearSession()
    navigate('/', { replace: true })
  }

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      {/* Scroll Controls */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        <button onClick={scrollToTop} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full shadow-lg border border-slate-700 transition-colors">
          <ArrowUp className="w-5 h-5" />
        </button>
        <button onClick={scrollToBottom} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg transition-colors">
          <ArrowDown className="w-5 h-5" />
        </button>
      </div>

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-lg font-semibold tracking-tight">Workout Builder</div>
              <div className="text-xs text-slate-400 font-mono">Coach: {session?.coachName || session?.code}</div>
            </div>
            <button
              onClick={() => navigate('/meal-planner')}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm hover:bg-slate-800 transition-colors"
            >
              <Utensils className="h-4 w-4" />
              Meal Planner
            </button>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm hover:bg-red-900/20 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: Controls & Grid (8 columns) */}
        <div className="lg:col-span-8 space-y-8">

          {/* Client Details Form */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Client Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Course Name</label>
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. 12KB Hypertrophy"
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Workout Day</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={workoutDay}
                  onChange={e => setWorkoutDay(e.target.value)}
                >
                  {dayTypes.map(day => <option key={day} value={day}>{day}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Client Name</label>
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. John Doe"
                  value={client.name}
                  onChange={e => setClient({ ...client, name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><User className="w-3 h-3" /> Gender</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
                  value={client.gender}
                  onChange={e => setClient({ ...client, gender: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Age</label>
                <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
                  value={client.age} onChange={e => setClient({ ...client, age: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Ruler className="w-3 h-3" /> Height (cm)</label>
                <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
                  value={client.height} onChange={e => setClient({ ...client, height: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Weight className="w-3 h-3" /> Weight (kg)</label>
                <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
                  value={client.weight} onChange={e => setClient({ ...client, weight: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Exercise Selection */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {muscleGroups.map(group => (
                  <button
                    key={group}
                    onClick={() => setActiveTab(group)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${activeTab === group ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                  >
                    {group}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsCustomModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
              >
                <Plus className="w-3 h-3" /> Custom Exercise
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredExercises.map(ex => {
                const isSelected = selected.some(s => s.id === ex.id)
                return (
                  <div
                    key={ex.id}
                    onClick={() => toggleExercise(ex)}
                    className={`group relative overflow-hidden rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-indigo-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'
                      }`}
                  >
                    <div className="aspect-video bg-slate-950 relative">
                      <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/60 backdrop-blur-sm">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      )}
                      {ex.isCustom && (
                        <button
                          onClick={(e) => deleteCustomExercise(ex.id, e)}
                          className="absolute top-2 right-2 p-1 bg-red-900/80 rounded-lg text-white hover:bg-red-600 transition-colors z-10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="font-medium text-sm text-slate-200 truncate">{ex.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{ex.muscleGroup}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Summary & Actions (4 columns) */}
        <div className="lg:col-span-4 space-y-6">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Workout Plan</h2>
              <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded-md">{selected.length} Exercises</span>
            </div>

            {selected.length === 0 ? (
              <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select exercises to build options</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {selected.map((ex, idx) => (
                  <div key={ex.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs text-slate-500 mb-0.5">#{idx + 1}</div>
                        <div className="font-medium text-sm">{ex.name}</div>
                      </div>
                      <button onClick={() => toggleExercise(ex)} className="text-slate-600 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">Sets</label>
                        <input type="number" className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-center"
                          value={ex.sets} onChange={e => updateExerciseDetails(ex.id, 'sets', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">Reps</label>
                        <input className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-center"
                          value={ex.reps} onChange={e => updateExerciseDetails(ex.id, 'reps', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-800">
              {status && <div className="mb-4 p-3 bg-indigo-900/30 border border-indigo-900/50 rounded-lg text-xs text-indigo-300">{status}</div>}

              <button
                onClick={generateAndSave}
                disabled={saving || selected.length === 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="animate-pulse">Generating...</span>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    Generate & Save PDF
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* CUSTOM EXERCISE MODAL */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Add Custom Exercise</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Exercise Name</label>
                <input
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                  value={newCustom.name}
                  onChange={e => setNewCustom({ ...newCustom, name: e.target.value })}
                  placeholder="e.g. Band Pull Aparts"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Muscle Group</label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                  value={newCustom.muscleGroup}
                  onChange={e => setNewCustom({ ...newCustom, muscleGroup: e.target.value })}
                >
                  {muscleGroups.filter(g => g !== 'All').map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustom}
                className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                Add Exercise
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF TEMPLATE (Hidden) */}
      <div style={{ display: 'none' }}>
        <div ref={pdfRef} className="bg-white text-slate-900 p-8 w-[210mm] min-h-[297mm]">
          <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold uppercase tracking-tight text-slate-900 mb-2">{courseName || 'Workout Plan'}</h1>
              <div className="text-sm text-slate-500 font-medium">Prepared for <span className="text-slate-900">{client.name || 'Client'}</span></div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Coach</div>
              <div className="font-bold text-lg">{session?.code}</div>
            </div>
          </div>

          {(client.age || client.height || client.weight) && (
            <div className="grid grid-cols-4 gap-4 mb-8 bg-slate-100 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Gender</div>
                <div className="font-semibold">{client.gender || '-'}</div>
              </div>
              <div className="text-center border-l border-slate-200">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Age</div>
                <div className="font-semibold">{client.age || '-'}</div>
              </div>
              <div className="text-center border-l border-slate-200">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Height</div>
                <div className="font-semibold">{client.height ? `${client.height}cm` : '-'}</div>
              </div>
              <div className="text-center border-l border-slate-200">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Weight</div>
                <div className="font-semibold">{client.weight ? `${client.weight}kg` : '-'}</div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {selected.map((ex, idx) => (
              <div key={ex.id + idx} className="flex gap-6 border border-slate-200 rounded-xl p-4 break-inside-avoid">
                <div className="w-1/3 aspect-video bg-slate-100 rounded-lg overflow-hidden relative">
                  {ex.imageUrl && <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover mix-blend-multiply" />}
                </div>
                <div className="flex-1 py-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Exercise {idx + 1}</div>
                      <h3 className="text-xl font-bold text-slate-900">{ex.name}</h3>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded text-slate-500">{ex.muscleGroup}</span>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div className="bg-slate-900 text-white rounded-lg px-4 py-2">
                        <div className="text-2xl font-bold leading-none">{ex.sets}</div>
                        <div className="text-[10px] font-medium opacity-60 uppercase mt-1">Sets</div>
                      </div>
                      <div className="bg-slate-100 text-slate-900 rounded-lg px-4 py-2">
                        <div className="text-2xl font-bold leading-none">{ex.reps}</div>
                        <div className="text-[10px] font-medium opacity-60 uppercase mt-1">Reps</div>
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100 my-4"></div>
                  <div className="grid grid-cols-5 gap-2">
                    {[...Array(Number(ex.sets))].map((_, i) => (
                      <div key={i} className="h-10 border border-slate-200 rounded bg-white flex items-center justify-center text-xs text-slate-300">Set {i + 1}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
            <p>Created with Coach App</p>
          </div>
        </div>
      </div>
    </div>
  )
}
