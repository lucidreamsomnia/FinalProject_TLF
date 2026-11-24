import api from './api'

export async function fetchDashboard() {
  const response = await api.get('/dashboard')
  return response.data
}

export async function validatePreferences(preferences) {
  const response = await api.post('/input/validate', preferences)
  return response.data
}

export async function uploadDataset(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/input/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function fetchRecommendations(preferences) {
  const response = await api.post('/recommendations', {
    ...preferences,
    top_n: 5,
  })
  return response.data
}

export async function fetchCatalog(parameters = {}) {
  const query = new URLSearchParams()

  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })

  const queryString = query.toString()
  const response = await api.get(queryString ? `/catalog?${queryString}` : '/catalog')
  return response.data
}

export async function fetchProcessing() {
  const response = await api.get('/processing')
  return response.data
}

export async function runProcessingDemonstration() {
  const response = await api.post('/processing/run')
  return response.data
}

export async function fetchEvaluation() {
  const response = await api.get('/evaluation')
  return response.data
}

export async function fetchSystemInfo() {
  const response = await api.get('/system-info')
  return response.data
}

export function getApiError(error, fallback = 'Terjadi kesalahan saat menghubungi server.') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || 'Input tidak valid.').join(' ')
  }
  return fallback
}
