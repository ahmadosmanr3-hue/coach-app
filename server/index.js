import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT } = process.env

// Temporary hardcoded values
const supabaseUrl = 'https://vvxuersifqewbxaowqnj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2eHVlcnNpZnFld2J4YW93cW5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwNDExNywiZXhwIjoyMDgzODgwMTE3fQ.G1XBYUkpeESO-TGUZDSoLEQy4w9CWWS8UdAAaSlepe4'

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials missing')
}

const supabase = createClient(supabaseUrl, supabaseKey)

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

function getAccessCode(req) {
  const code = req.header('x-access-code')
  return (code || '').trim()
}

async function requireCoach(req, res, next) {
  const code = getAccessCode(req)
  if (!code) return res.status(401).json({ error: 'Missing access code' })

  const { data, error } = await supabase
    .from('access_codes')
    .select('code, coach_name, role')
    .eq('code', code)
    .eq('role', 'coach')
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(401).json({ error: 'Invalid coach code' })

  req.coach = data
  next()
}

function requireAdmin(req, res, next) {
  const code = getAccessCode(req)
  if (code !== 'ADMIN-99') return res.status(401).json({ error: 'Invalid admin code' })
  next()
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.post('/api/login', async (req, res) => {
  try {
    const code = (req.body?.code || '').trim()
    if (!code) return res.status(400).json({ error: 'Code is required' })

    if (code === 'ADMIN-99') {
      return res.json({ role: 'admin', code: 'ADMIN-99' })
    }

    const { data, error } = await supabase
      .from('access_codes')
      .select('code, coach_name, role')
      .eq('code', code)
      .eq('role', 'coach')
      .maybeSingle()

    if (error) {
      console.error('Supabase Error:', error)
      return res.status(500).json({ error: 'Db Error: ' + error.message })
    }
    if (!data) return res.status(401).json({ error: 'Invalid access code' })

    res.json(data)
  } catch (err) {
    console.error('Login Crash:', err)
    res.status(500).json({ error: 'Server Crash: ' + err.message })
  }
})

app.post('/api/workout-logs', requireCoach, async (req, res) => {
  console.log('Received request body:', JSON.stringify(req.body, null, 2))

  const coach_code = (req.body?.coach_code || '').trim()
  const client_name = (req.body?.client_name || '').trim()
  const client_gender = (req.body?.client_gender || '').trim()
  const client_age = req.body?.client_age
  const client_height_cm = req.body?.client_height_cm
  const client_weight_kg = req.body?.client_weight_kg
  const exercises_json = req.body?.exercises_json
  const course_name = req.body?.course_name

  if (!coach_code) return res.status(400).json({ error: 'coach_code is required' })
  if (!client_name) return res.status(400).json({ error: 'client_name is required' })
  if (!client_gender) return res.status(400).json({ error: 'client_gender is required' })
  if (typeof client_age !== 'number' || client_age < 1) return res.status(400).json({ error: 'client_age must be a positive number' })
  if (typeof client_height_cm !== 'number' || client_height_cm < 1) return res.status(400).json({ error: 'client_height_cm must be a positive number' })
  if (typeof client_weight_kg !== 'number' || client_weight_kg < 1) return res.status(400).json({ error: 'client_weight_kg must be a positive number' })

  // Relax validation to support both legacy array format and new 3-day object format
  const isExercisesValid = Array.isArray(exercises_json) || (typeof exercises_json === 'object' && exercises_json !== null)
  if (!isExercisesValid) return res.status(400).json({ error: 'exercises_json must be an array or object' })

  if (coach_code !== req.coach.code) {
    return res.status(403).json({ error: 'coach_code must match your access code' })
  }

  const { data: coachData, error: coachError } = await supabase
    .from('access_codes')
    .select('commission_per_workout')
    .eq('code', coach_code)
    .single()

  if (coachError || !coachData) return res.status(400).json({ error: 'Invalid coach code' })

  // Use commission_amount from body if provided (allows frontend to set $2), otherwise use DB default
  const commission_amount = req.body.commission_amount || coachData.commission_per_workout || 2

  // Safe logging for both array and object structures
  const exerciseCount = Array.isArray(exercises_json)
    ? exercises_json.length
    : Object.values(exercises_json).reduce((sum, d) => sum + (Array.isArray(d) ? d.length : 0), 0)

  console.log('Creating workout log:', {
    coach_code,
    client_name,
    exercises_count: exerciseCount,
    commission_amount,
    course_name,
  })

  const { data, error } = await supabase
    .from('workout_logs')
    .insert({
      coach_code,
      client_name,
      client_gender,
      client_age,
      client_height_cm,
      client_weight_kg,
      exercises_json,
      commission_amount,
      course_name,
    })
    .select('id, coach_code, client_name, client_gender, client_age, client_height_cm, client_weight_kg, exercises_json, commission_amount, course_name, created_at')
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    return res.status(500).json({ error: error.message })
  }

  console.log('Successfully created workout log:', data)
  res.json(data)
})

app.get('/api/workout-logs', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  res.json(data)
})

app.delete('/api/workout-logs', requireAdmin, async (req, res) => {
  // 1. Fetch all IDs first to avoid "delete without filter" issues
  const { data: rows, error: fetchError } = await supabase
    .from('workout_logs')
    .select('id')

  if (fetchError) return res.status(500).json({ error: 'Fetch failed: ' + fetchError.message })

  if (!rows || rows.length === 0) {
    return res.json({ deleted: true, count: 0 })
  }

  const ids = rows.map((r) => r.id)

  // 2. Delete explicitly by ID list
  const { error: deleteError } = await supabase
    .from('workout_logs')
    .delete()
    .in('id', ids)

  if (deleteError) return res.status(500).json({ error: 'Delete failed: ' + deleteError.message })

  res.json({ deleted: true, count: ids.length })
})

if (process.env.NODE_ENV !== 'production') {
  app.listen(Number(PORT) || 3001, () => {
    console.log(`API listening on http://localhost:${Number(PORT) || 3001}`)
  })
}

export default app
