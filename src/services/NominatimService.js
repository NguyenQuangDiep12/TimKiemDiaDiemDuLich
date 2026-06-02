const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

class NominatimService {
  async search(query) {
    if (!query?.trim()) {
      throw new Error('Vui lòng nhập từ khóa tìm kiếm')
    }

    const params = new URLSearchParams({
      q: query.trim(),
      format: 'json',
      limit: '5',
      countrycodes: 'vn'
    })

    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`Nominatim API lỗi: ${response.status}`)
    }

    const results = await response.json()

    if (!results.length) {
      throw new Error('Không tìm thấy địa điểm phù hợp')
    }

    return results.map((item) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type
    }))
  }

  async reverseGeocode(lat, lon) {
    return this.reverse(lat, lon)
  }

  async reverse(lat, lon) {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json'
    })

    const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`Nominatim API lỗi: ${response.status}`)
    }

    const data = await response.json()

    return {
      display_name: data.display_name,
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
      address: data.address
    }
  }
}

export default new NominatimService()
