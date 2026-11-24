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

export function getApiError(error, fallback = 'Terjadi kesalahan saat menghubungi server.') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || 'Input tidak valid.').join(' ')
  }
  return fallback
}
