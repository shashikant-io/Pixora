/**
 * Admin App Centralized API Service
 * Includes defensive JSON parsing to completely eliminate "Unexpected token 'T'..." syntax errors
 * and supports environment-driven API origins for Web and Desktop App packaging.
 */

export function getAdminToken() {
  if (typeof window === 'undefined') return null
  return (
    localStorage.getItem('photo_finder_admin_token') ||
    localStorage.getItem('photo_finder_token') ||
    sessionStorage.getItem('photo_finder_admin_token') ||
    sessionStorage.getItem('photo_finder_token')
  )
}

export function setAdminToken(token) {
  if (typeof window === 'undefined') return
  localStorage.setItem('photo_finder_admin_token', token)
  localStorage.setItem('photo_finder_token', token)
}

export function clearAdminToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('photo_finder_admin_token')
  localStorage.removeItem('photo_finder_token')
  localStorage.removeItem('photo_finder_user')
  sessionStorage.removeItem('photo_finder_admin_token')
  sessionStorage.removeItem('photo_finder_token')
  sessionStorage.removeItem('photo_finder_user')
}

export function getAuthHeaders(extraHeaders = {}) {
  const token = getAdminToken()
  const headers = { ...extraHeaders }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Resolves the API origin for both browser and packaged desktop environments.
 * Uses VITE_API_URL if specified in production.
 */
export function getApiOrigin() {
  const envUrl = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  if (envUrl) return envUrl
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'http://127.0.0.1:4000'
  }
  return ''
}

export function resolveUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const origin = getApiOrigin()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${origin}${cleanPath}`
}

/**
 * Defensive fetch wrapper that guarantees valid JSON parsing
 * and extracts human-readable text preview on non-JSON/HTML errors.
 */
export async function safeFetch(url, options = {}) {
  const finalUrl = resolveUrl(url)
  const config = {
    ...options,
    headers: getAuthHeaders(options.headers || {}),
  }

  let res
  try {
    res = await fetch(finalUrl, config)
  } catch (netErr) {
    throw new Error(
      `Cannot connect to server at ${finalUrl}. Ensure backend API is online.`
    )
  }

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.toLowerCase().includes('application/json')

  if (!isJson) {
    const rawText = await res.text()
    const cleanSnippet = rawText
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180)

    if (res.status === 404) {
      throw new Error(`Endpoint not found (404): ${finalUrl}`)
    }
    if (res.status === 502 || res.status === 504) {
      throw new Error(
        `Backend server unavailable (${res.status}) at ${finalUrl}.`
      )
    }

    throw new Error(
      `Server returned HTML/text (${res.status} ${res.statusText}): ${cleanSnippet || 'No response body'}`
    )
  }

  let data
  try {
    data = await res.json()
  } catch (jsonErr) {
    throw new Error('Received malformed JSON from server.')
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`)
  }

  return data
}

// -------------------------------------------------------------
// Core Admin API Methods
// -------------------------------------------------------------

export async function checkHealth() {
  return safeFetch('/api/health')
}

export async function getMe() {
  return safeFetch('/api/auth/me')
}

export async function getEvents() {
  const data = await safeFetch('/api/events')
  return data.events || []
}

export async function createEvent({ name, date, location }) {
  return safeFetch('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name.trim(),
      date,
      location: location.trim() || 'Main Venue',
    }),
  })
}

export async function deleteEvent(eventId) {
  return safeFetch(`/api/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  })
}

export async function getEventQr(eventId, guestUrl) {
  return safeFetch(
    `/api/events/${encodeURIComponent(eventId)}/qr?guestUrl=${encodeURIComponent(guestUrl)}`
  )
}

export async function getStorageStats(force = false) {
  return safeFetch(`/api/admin/storage${force ? '?force=true' : ''}`)
}

export async function getUsersActivity() {
  return safeFetch('/api/admin/users')
}

/**
 * Upload single photo with live progress tracking
 */
export function uploadPhotoFile(eventId, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const token = getAdminToken()
    const uploadUrl = resolveUrl('/api/photos/upload')

    xhr.open('POST', uploadUrl, true)
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    if (xhr.upload && onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          onProgress(percent)
        }
      })
    }

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader('content-type') || ''
      if (!contentType.includes('application/json')) {
        const snippet = xhr.responseText.replace(/<[^>]+>/g, ' ').trim().slice(0, 140)
        return reject(
          new Error(`Upload failed (${xhr.status}): ${snippet || xhr.statusText}`)
        )
      }

      try {
        const json = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && json.success) {
          resolve(json)
        } else {
          reject(new Error(json.message || `Upload failed with status ${xhr.status}`))
        }
      } catch (err) {
        reject(new Error('Invalid response received from upload endpoint.'))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network error occurred during photo upload.'))
    }

    const formData = new FormData()
    formData.append('eventId', eventId)
    formData.append('photo', file)

    xhr.send(formData)
  })
}
