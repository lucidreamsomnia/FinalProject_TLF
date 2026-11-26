const STORAGE_KEY = 'laptopfind-user-preferences'

export function savePreferences(preferences) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}

export function readPreferences() {
  const stored = sessionStorage.getItem(STORAGE_KEY)

  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function clearPreferences() {
  sessionStorage.removeItem(STORAGE_KEY)
}