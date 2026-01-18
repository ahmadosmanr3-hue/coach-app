import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
    FileDown,
    LogOut,
    ArrowLeft,
    User,
    Activity,
    Calendar,
    Clock,
    Briefcase,
    Utensils,
    Pill,
    Cigarette,
    Moon,
    Dumbbell
} from 'lucide-react'
import { getSession, clearSession } from '../lib/session.js'

export default function ClientAssessmentPage() {
    const navigate = useNavigate()
    const pdfRef = useRef(null)
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        gender: '',
        age: '',
        occupation: '',
        weight: '',
        height: '',
        chronicIllnesses: '',
        surgeries: '',
        appetite: '',
        mealsPerDay: '',
        allergies: '',
        supplementsCurrent: '',
        supplementsBudget: '',
        supplementsWanted: 'No',
        hormonesUsed: 'No',
        smokeOrDrink: '',
        sleepHours: '',
        wakeTime: '',
        workDays: '',
        workStart: '',
        workEnd: '',
        lastTrained: '',
        otherSports: '',
        trainingTime: ''
    })

    useEffect(() => {
        const s = getSession()
        if (!s || s.role !== 'coach') {
            navigate('/', { replace: true })
            return
        }
        // Override coach name
        if (s.code === 'COACH-123') {
            s.coachName = 'Nasr Akram'
        }
        setSession(s)
        setLoading(false)
    }, [navigate])

    function handleChange(e) {
        const { name, value } = e.target
        const newData = { ...formData, [name]: value }
        setFormData(newData)
        // Store for other builders to pick up
        localStorage.setItem('last_assessment_data', JSON.stringify(newData))
    }

    function logout() {
        clearSession()
        navigate('/', { replace: true })
    }

    async function generatePDF() {
        if (!formData.fullName) {
            alert('Please enter at least the Full Name.')
            return
        }

        setSaving(true)
        try {
            const element = pdfRef.current
            const clone = element.cloneNode(true)

            // Setup clone for rendering
            clone.style.display = 'block'
            clone.style.position = 'fixed'
            clone.style.left = '-9999px'
            clone.style.top = '0'
            clone.style.width = '210mm'
            clone.style.zIndex = '-9999'

            document.body.appendChild(clone)

            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 1000
            })

            document.body.removeChild(clone)

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const imgWidth = 210
            const imgHeight = (canvas.height * imgWidth) / canvas.width
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

            pdf.save(`${formData.fullName.replace(/\s+/g, '-')}-assessment.pdf`)

        } catch (err) {
            console.error(err)
            alert('Failed to generate PDF')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

            {/* HEADER */}
            <header className="border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10 backdrop-blur-md">
                <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between px-4 sm:px-6 py-4 gap-4">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <button
                            onClick={() => navigate('/builder')}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="text-lg font-semibold tracking-tight">Client Assessment</div>
                            <div className="text-xs text-slate-400 font-mono">Coach: {session?.coachName || session?.code}</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate('/builder')}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-[13px] hover:bg-slate-800 transition-colors whitespace-nowrap"
                            >
                                <Dumbbell className="h-4 w-4" />
                                <span className="hidden sm:inline">Workout Builder</span>
                                <span className="sm:hidden">Workout</span>
                            </button>
                            <button
                                onClick={() => navigate('/meal-planner')}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-[13px] hover:bg-slate-800 transition-colors whitespace-nowrap"
                            >
                                <Utensils className="h-4 w-4" />
                                <span className="hidden sm:inline">Meal Planner</span>
                                <span className="sm:hidden">Meals</span>
                            </button>
                        </div>
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

            <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-8">

                <div className="grid gap-8">

                    {/* Section 1: Personal Info */}
                    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                <User className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold">Personal Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">1. Full Name</label>
                                <input name="fullName" value={formData.fullName} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-700" placeholder="e.g. John Doe" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">2. Phone Number</label>
                                <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">3. Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-all">
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">4. Age</label>
                                <input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">5. Occupation</label>
                                <input name="occupation" value={formData.occupation} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">6. Weight (kg)</label>
                                <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">7. Height (cm)</label>
                                <input type="number" name="height" value={formData.height} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-all" />
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Health & Medical */}
                    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                                <Activity className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold">Health & Medical</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">10. Chronic illnesses or medications?</label>
                                <textarea name="chronicIllnesses" value={formData.chronicIllnesses} onChange={handleChange} rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-500 transition-all resize-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">11. Open surgeries or internal issues?</label>
                                <textarea name="surgeries" value={formData.surgeries} onChange={handleChange} rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-500 transition-all resize-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">14. Food allergies or sensitivities?</label>
                                <input name="allergies" value={formData.allergies} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">18. Have you ever used hormones?</label>
                                <select name="hormonesUsed" value={formData.hormonesUsed} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-500 transition-all">
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Lifestyle & Nutrition */}
                    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                <Utensils className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold">Lifestyle & Nutrition</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">12. Appetite</label>
                                <select name="appetite" value={formData.appetite} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all">
                                    <option value="">Select</option>
                                    <option value="Very Poor">Very Poor</option>
                                    <option value="Poor">Poor</option>
                                    <option value="Average">Average</option>
                                    <option value="Good">Good</option>
                                    <option value="Very Good">Very Good</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">13. Meals per day</label>
                                <input type="number" name="mealsPerDay" value={formData.mealsPerDay} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Cigarette className="w-3 h-3" /> 19. Smoke or Alcohol?</label>
                                <input name="smokeOrDrink" value={formData.smokeOrDrink} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all" placeholder="e.g. Socially" />
                            </div>

                            <div className="md:col-span-3 h-px bg-slate-800 my-2"></div>

                            {/* Supplements */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Pill className="w-3 h-3" /> 15. Current Supplements</label>
                                <input name="supplementsCurrent" value={formData.supplementsCurrent} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all" placeholder="None" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Pill className="w-3 h-3" /> 16. Include in Plan?</label>
                                <select name="supplementsWanted" value={formData.supplementsWanted} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all">
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Pill className="w-3 h-3" /> 17. Supplement Budget</label>
                                <input name="supplementsBudget" value={formData.supplementsBudget} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-all" placeholder="$" />
                            </div>

                        </div>
                    </section>

                    {/* Section 4: Schedule & Training */}
                    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                                <Clock className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold">Schedule & Training</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Moon className="w-3 h-3" /> 20. Sleep Hours</label>
                                <input type="number" name="sleepHours" value={formData.sleepHours} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3" /> 21. Wake Up Time</label>
                                <input type="time" name="wakeTime" value={formData.wakeTime} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Briefcase className="w-3 h-3" /> 22. Work Days/Week</label>
                                <input type="number" name="workDays" value={formData.workDays} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" />
                            </div>

                            <div className="hidden lg:block"></div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Briefcase className="w-3 h-3" /> 23. Work Start</label>
                                <input type="time" name="workStart" value={formData.workStart} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Briefcase className="w-3 h-3" /> 24. Work End</label>
                                <input type="time" name="workEnd" value={formData.workEnd} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" />
                            </div>

                            <div className="md:col-span-2 lg:col-span-4 h-px bg-slate-800 my-2"></div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Dumbbell className="w-3 h-3" /> 25. Time since last trained?</label>
                                <input name="lastTrained" value={formData.lastTrained} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Dumbbell className="w-3 h-3" /> 26. Other sports?</label>
                                <input name="otherSports" value={formData.otherSports} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" placeholder="None" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3" /> 27. Preferred Training Time</label>
                                <input type="time" name="trainingTime" value={formData.trainingTime} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" />
                            </div>
                        </div>
                    </section>

                    <button
                        onClick={generatePDF}
                        disabled={saving}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-lg shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? <span className="animate-pulse">Generating PDF...</span> : (
                            <>
                                <FileDown className="w-5 h-5" />
                                Download Assessment PDF
                            </>
                        )}
                    </button>
                </div>
            </main>

            {/* PDF TEMPLATE */}
            <div style={{ display: 'none' }}>
                <div ref={pdfRef} className="bg-white text-slate-900 p-10 w-[210mm] min-h-[297mm] font-sans">

                    <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-900 mb-1">Client Assessment</h1>
                            <div className="text-sm text-slate-500 font-medium">Confidential Intake Form</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Coach</div>
                            <div className="font-bold text-lg">{session?.coachName || session?.code}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-12 gap-y-8">

                        <Section title="Personal Details">
                            <Field label="Full Name" value={formData.fullName} />
                            <Field label="Gender" value={formData.gender} />
                            <Field label="Age" value={formData.age} />
                            <Field label="Occupation" value={formData.occupation} />
                            <Field label="Phone" value={formData.phoneNumber} />
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Weight" value={formData.weight ? `${formData.weight} kg` : ''} />
                                <Field label="Height" value={formData.height ? `${formData.height} cm` : ''} />
                            </div>
                        </Section>

                        <Section title="Health Profile">
                            <Field label="Chronic Illnesses" value={formData.chronicIllnesses} />
                            <Field label="Surgeries/Issues" value={formData.surgeries} />
                            <Field label="Allergies" value={formData.allergies} />
                            <Field label="Hormone Usage" value={formData.hormonesUsed} />
                            <Field label="Smoke/Alcohol" value={formData.smokeOrDrink} />
                        </Section>

                        <Section title="Nutrition & Lifestyle">
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Appetite" value={formData.appetite} />
                                <Field label="Meals/Day" value={formData.mealsPerDay} />
                            </div>
                            <Field label="Current Supplements" value={formData.supplementsCurrent} />
                            <Field label="Want Supplements?" value={formData.supplementsWanted} />
                            <Field label="Budget" value={formData.supplementsBudget} />
                        </Section>

                        <Section title="Schedule & Training">
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Sleep Hours" value={formData.sleepHours} />
                                <Field label="Work Days" value={formData.workDays} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Wake Up" value={formData.wakeTime} />
                                <Field label="Training Time" value={formData.trainingTime} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Work Start" value={formData.workStart} />
                                <Field label="Work End" value={formData.workEnd} />
                            </div>
                            <Field label="Last Trained" value={formData.lastTrained} />
                            <Field label="Other Sports" value={formData.otherSports} />
                        </Section>

                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-200 text-center text-slate-400 text-xs">
                        <p>Assessment Date: {new Date().toLocaleDateString()}</p>
                    </div>

                </div>
            </div>

        </div >
    )
}

function Section({ title, children }) {
    return (
        <div className="mb-2">
            <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 uppercase text-sm tracking-wider">{title}</h3>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    )
}

function Field({ label, value }) {
    return (
        <div>
            <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wide mb-0.5">{label}</div>
            <div className="text-sm font-medium text-slate-900 min-h-[1.25rem]">{value || '-'}</div>
        </div>
    )
}
