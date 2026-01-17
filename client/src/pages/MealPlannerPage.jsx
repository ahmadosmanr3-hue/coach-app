import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { FileDown, LogOut, User, Calendar, Ruler, Weight, Utensils } from 'lucide-react'
import { clearSession, getSession } from '../lib/session.js'
import { createWorkoutLog } from '../lib/api.js'

export default function MealPlannerPage() {
    const navigate = useNavigate()
    const [session, setSession] = useState(() => getSession())
    const [clientName, setClientName] = useState('')
    const [clientGender, setClientGender] = useState('')
    const [clientAge, setClientAge] = useState('')
    const [clientHeight, setClientHeight] = useState('')
    const [clientWeight, setClientWeight] = useState('')
    const [courseName, setCourseName] = useState('')
    const [calorieTarget, setCalorieTarget] = useState('')
    const [dietaryRestrictions, setDietaryRestrictions] = useState('')
    const [activityLevel, setActivityLevel] = useState('sedentary')
    const [goal, setGoal] = useState('maintain')

    // Meal sections
    const [breakfast, setBreakfast] = useState('')
    const [lunch, setLunch] = useState('')
    const [dinner, setDinner] = useState('')
    const [snacks, setSnacks] = useState('')
    const [notes, setNotes] = useState('')

    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState('')

    const targetRef = useRef(null)

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
    }, [navigate])

    function calculateCalories() {
        // Validate inputs
        if (!clientAge || !clientHeight || !clientWeight || !clientGender) {
            setStatus('Please fill in age, gender, height, and weight to calculate calories')
            return
        }

        const age = parseInt(clientAge)
        const height = parseInt(clientHeight)
        const weight = parseInt(clientWeight)

        // Calculate BMR using Mifflin-St Jeor equation
        let bmr
        if (clientGender === 'Male') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        } else if (clientGender === 'Female') {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161
        } else {
            // Use average for "Other"
            bmr = 10 * weight + 6.25 * height - 5 * age - 78
        }

        // Activity multipliers
        const activityMultipliers = {
            sedentary: 1.2,        // Little to no exercise
            light: 1.375,          // Light exercise 1-3 days/week
            moderate: 1.55,        // Moderate exercise 3-5 days/week
            active: 1.725,         // Heavy exercise 6-7 days/week
            veryActive: 1.9        // Very heavy exercise, physical job
        }

        // Calculate TDEE (Total Daily Energy Expenditure)
        const tdee = bmr * activityMultipliers[activityLevel]

        // Adjust for goal
        let targetCalories
        let proteinMultiplier

        if (goal === 'lose') {
            targetCalories = Math.round(tdee - 500) // 500 calorie deficit
            proteinMultiplier = 2.2 // Higher protein to preserve muscle in deficit
        } else if (goal === 'gain') {
            targetCalories = Math.round(tdee + 300) // 300 calorie surplus
            proteinMultiplier = 2.0 // High protein to support muscle growth
        } else {
            targetCalories = Math.round(tdee)
            proteinMultiplier = 1.8 // Moderate protein for maintenance
        }

        const targetProtein = Math.round(weight * proteinMultiplier)

        setCalorieTarget(`${targetCalories} kcal | ${targetProtein}g Protein`)
        setStatus(`Calculated: ${targetCalories} kcal & ${targetProtein}g Protein based on ${activityLevel} activity`)
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

        if (!breakfast.trim() && !lunch.trim() && !dinner.trim() && !snacks.trim()) {
            setStatus('Please add at least one meal')
            return
        }

        setSaving(true)
        try {
            const element = targetRef.current
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            })

            const imgWidth = 210
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
            pdf.save(`${clientName.replaceAll(' ', '-')}.pdf`)

            // Log the meal plan so it shows up in Admin dashboard
            await createWorkoutLog(session.code, {
                coach_code: session.code,
                client_name: clientName,
                client_gender: clientGender,
                client_age: Number(clientAge),
                client_height_cm: Number(clientHeight),
                client_weight_kg: Number(clientWeight),
                course_name: `[MEAL PLAN] ${courseName}`,
                exercises_json: [{
                    id: 'meal-plan',
                    name: 'Custom Meal Plan',
                    muscleGroup: 'Nutrition',
                    imageUrl: '',
                    sets: 1,
                    reps: 1,
                    isCustom: true
                }]
            })

            setStatus('Meal plan PDF generated and logged successfully!')

            // Clear form for next meal plan
            setClientName('')
            setClientGender('')
            setClientAge('')
            setClientHeight('')
            setClientWeight('')
            setCourseName('')
            setCalorieTarget('')
            setDietaryRestrictions('')
            setBreakfast('')
            setLunch('')
            setDinner('')
            setSnacks('')
            setNotes('')
        } catch (err) {
            setStatus(err?.message || 'Failed to generate PDF')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            <header className="border-b border-slate-800 bg-slate-950/60 flex-shrink-0">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-6">
                        <div>
                            <div className="text-lg font-semibold">Meal Planner</div>
                            <div className="text-xs text-slate-400">Coach code: {session?.code}</div>
                        </div>
                        <button
                            onClick={() => navigate('/builder')}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm hover:bg-slate-800/50"
                        >
                            <Utensils className="h-4 w-4" />
                            Workout Builder
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
                    {/* Left side - Meal Plan Editor */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Client Information */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                            <h2 className="text-sm font-semibold text-slate-200 mb-4">Client Information</h2>

                            <div className="space-y-4">
                                {/* Course Name */}
                                <div>
                                    <label className="text-xs font-medium text-slate-300 mb-1 block">Course Name</label>
                                    <input
                                        value={courseName}
                                        onChange={(e) => setCourseName(e.target.value)}
                                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                        placeholder="e.g. Weight Loss Program"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
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
                                    <div>
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
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div>
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
                                    <div>
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
                                    <div>
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

                                {/* Calorie Calculator Controls */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-medium text-slate-300 mb-1 block">Activity Level</label>
                                        <select
                                            value={activityLevel}
                                            onChange={(e) => setActivityLevel(e.target.value)}
                                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                        >
                                            <option value="sedentary">Sedentary (Little/no exercise)</option>
                                            <option value="light">Lightly Active (1-3 days/week)</option>
                                            <option value="moderate">Moderately Active (3-5 days/week)</option>
                                            <option value="active">Active (6-7 days/week)</option>
                                            <option value="veryActive">Very Active (Physical job)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-300 mb-1 block">Goal</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={goal}
                                                onChange={(e) => setGoal(e.target.value)}
                                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                            >
                                                <option value="maintain">Maintain Weight</option>
                                                <option value="lose">Lose Weight (-500 kcal)</option>
                                                <option value="gain">Gain Weight (+300 kcal)</option>
                                            </select>
                                            <button
                                                onClick={calculateCalories}
                                                className="whitespace-nowrap px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                                                title="Calculate Daily Calories"
                                            >
                                                Calculate
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-medium text-slate-300 mb-1 block">Calorie Target</label>
                                        <input
                                            value={calorieTarget}
                                            onChange={(e) => setCalorieTarget(e.target.value)}
                                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                            placeholder="e.g. 2000 kcal/day"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-300 mb-1 block">Dietary Restrictions (Optional)</label>
                                        <input
                                            value={dietaryRestrictions}
                                            onChange={(e) => setDietaryRestrictions(e.target.value)}
                                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                            placeholder="e.g. Vegetarian, Gluten-free"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Meal Plan Editor */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
                            <h2 className="text-sm font-semibold text-slate-200">Meal Plan</h2>

                            <div>
                                <label className="text-xs font-medium text-slate-300 mb-1 block">🍳 Breakfast</label>
                                <textarea
                                    value={breakfast}
                                    onChange={(e) => setBreakfast(e.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[100px]"
                                    placeholder="e.g., Scrambled eggs with whole wheat toast, avocado, and orange juice"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-300 mb-1 block">🥗 Lunch</label>
                                <textarea
                                    value={lunch}
                                    onChange={(e) => setLunch(e.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[100px]"
                                    placeholder="e.g., Grilled chicken salad with mixed greens, quinoa, and olive oil dressing"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-300 mb-1 block">🍽️ Dinner</label>
                                <textarea
                                    value={dinner}
                                    onChange={(e) => setDinner(e.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[100px]"
                                    placeholder="e.g., Baked salmon with sweet potato and steamed broccoli"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-300 mb-1 block">🍎 Snacks</label>
                                <textarea
                                    value={snacks}
                                    onChange={(e) => setSnacks(e.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[80px]"
                                    placeholder="e.g., Greek yogurt, almonds, protein shake, apple slices"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-300 mb-1 block">📝 Additional Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[80px]"
                                    placeholder="e.g., Drink 8 glasses of water daily, avoid processed foods, meal prep on Sundays"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right side - PDF Preview */}
                    <div className="lg:col-span-1">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sticky top-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-200">Meal Plan Preview</h2>
                                    <p className="text-xs text-slate-400">This will be exported to PDF</p>
                                </div>
                                <button
                                    onClick={generateAndSave}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-600"
                                >
                                    <FileDown className="h-4 w-4" />
                                    {saving ? 'Generating...' : 'Generate PDF'}
                                </button>
                            </div>

                            {status && <div className="mb-3 text-xs text-slate-300">{status}</div>}

                            <div ref={targetRef} className="rounded-xl bg-white p-6 text-slate-900 max-h-[600px] overflow-y-auto">
                                <div className="mb-6 border-b border-slate-200 pb-4">
                                    <div className="text-2xl font-bold">Meal Plan</div>
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
                                    {calorieTarget && (
                                        <div className="mt-2 text-xs text-slate-600">
                                            Target: {calorieTarget}
                                        </div>
                                    )}
                                    {dietaryRestrictions && (
                                        <div className="mt-1 text-xs text-slate-600">
                                            Restrictions: {dietaryRestrictions}
                                        </div>
                                    )}
                                    <div className="mt-3 text-right text-xs text-slate-400">
                                        Coach: {session?.coachName || session?.code}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {breakfast && (
                                        <div>
                                            <div className="text-sm font-bold text-slate-700 mb-1">🍳 Breakfast</div>
                                            <div className="text-xs text-slate-600 whitespace-pre-wrap">{breakfast}</div>
                                        </div>
                                    )}

                                    {lunch && (
                                        <div>
                                            <div className="text-sm font-bold text-slate-700 mb-1">🥗 Lunch</div>
                                            <div className="text-xs text-slate-600 whitespace-pre-wrap">{lunch}</div>
                                        </div>
                                    )}

                                    {dinner && (
                                        <div>
                                            <div className="text-sm font-bold text-slate-700 mb-1">🍽️ Dinner</div>
                                            <div className="text-xs text-slate-600 whitespace-pre-wrap">{dinner}</div>
                                        </div>
                                    )}

                                    {snacks && (
                                        <div>
                                            <div className="text-sm font-bold text-slate-700 mb-1">🍎 Snacks</div>
                                            <div className="text-xs text-slate-600 whitespace-pre-wrap">{snacks}</div>
                                        </div>
                                    )}

                                    {notes && (
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <div className="text-sm font-bold text-slate-700 mb-1">📝 Notes</div>
                                            <div className="text-xs text-slate-600 whitespace-pre-wrap">{notes}</div>
                                        </div>
                                    )}

                                    {!breakfast && !lunch && !dinner && !snacks && (
                                        <div className="text-sm text-slate-500">No meals added yet.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
