import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(401).json({ error: 'Invalid access code' })

  res.json(data)
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
  if (!Array.isArray(exercises_json)) return res.status(400).json({ error: 'exercises_json must be an array' })

  if (coach_code !== req.coach.code) {
    return res.status(403).json({ error: 'coach_code must match your access code' })
  }

  const { data: coachData, error: coachError } = await supabase
    .from('access_codes')
    .select('commission_per_workout')
    .eq('code', coach_code)
    .single()

  if (coachError || !coachData) return res.status(400).json({ error: 'Invalid coach code' })

  const commission_amount = coachData.commission_per_workout || 2

  console.log('Creating workout log:', {
    coach_code,
    client_name,
    exercises_json: exercises_json.length + ' exercises',
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
  const { error } = await supabase
    .from('workout_logs')
    .delete()
    .neq('id', -1) // delete all rows

  if (error) return res.status(500).json({ error: error.message })

  res.json({ deleted: true })
})

app.listen(Number(PORT) || 3001, () => {
  console.log(`API listening on http://localhost:${Number(PORT) || 3001}`)
})
