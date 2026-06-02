export function createLocation(name, lat, lon) {
  return { name: name || '', lat, lon }
}

export function formatDistance(meters) {
  if (meters == null) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDuration(seconds) {
  if (seconds == null) return '—'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`
}

export function formatKinds(kinds) {
  if (!kinds) return 'Du lịch'
  return kinds
    .split(',')
    .slice(0, 3)
    .map((k) => k.replace(/_/g, ' '))
    .join(', ')
}

export function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text ?? ''
  return div.innerHTML
}

export function showToast(msg, duration = 2800) {
  const toast = document.getElementById('status-toast')
  if (toast) {
    toast.textContent = msg
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), duration)
  }
}
