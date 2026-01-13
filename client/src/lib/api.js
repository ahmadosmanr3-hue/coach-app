const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
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
