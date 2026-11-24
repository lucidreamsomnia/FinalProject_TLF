const STORAGE_KEY = 'laptopfind-recommendation-response'

export function saveRecommendationResponse(response) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(response))
}

export function readRecommendationResponse() {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}
