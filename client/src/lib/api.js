const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const url = `${API_BASE_URL}${path}`
  console.log('Making request to:', url)
  console.log('Method:', method)
  console.log('Body:', body)
  
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  console.log('Response status:', res.status)
  console.log('Response ok:', res.ok)

  const text = await res.text()
  console.log('Response text:', text)
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`
    throw new Error(message)
  }

  return data
}

export function loginWithCode(code) {
  return request('/api/login', {
    method: 'POST',
    body: { code },
  })
}

export function createWorkoutLog(accessCode, payload) {
  return request('/api/workout-logs', {
    method: 'POST',
    headers: {
      'x-access-code': accessCode,
    },
    body: payload,
  })
}

export function listWorkoutLogs(accessCode) {
  return request('/api/workout-logs', {
    method: 'GET',
    headers: {
      'x-access-code': accessCode,
    },
  })
}

export function deleteAllWorkoutLogs(accessCode) {
  return request('/api/workout-logs', {
    method: 'DELETE',
    headers: {
      'x-access-code': accessCode,
    },
  })
}
