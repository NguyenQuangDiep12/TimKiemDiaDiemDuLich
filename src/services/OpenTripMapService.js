import { CONFIG } from '../utils/constants.js'

const OPENTRIPMAP_BASE = 'https://api.opentripmap.com/0.1/en/places'

class OpenTripMapService {
  async getNearbyPlaces(lat, lon, radius = CONFIG.SEARCH_RADIUS) {
    const params = new URLSearchParams({
      radius: String(radius),
      lon: String(lon),
      lat: String(lat),
      rate: '2',
      limit: '20',
      apikey: CONFIG.OPENTRIPMAP_API_KEY
    })

    const response = await fetch(`${OPENTRIPMAP_BASE}/radius?${params}`)

    if (!response.ok) {
      throw new Error(`OpenTripMap API lỗi: ${response.status}`)
    }

    const data = await response.json()

    if (!data.features?.length) {
      return []
    }

    return data.features
      .filter((f) => f.properties?.name)
      .map((f) => ({
        xid: f.properties.xid,
        name: f.properties.name,
        kinds: f.properties.kinds,
        dist: f.properties.dist,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0]
      }))
      .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))
  }

  async getPlaceDetails(xid) {
    const params = new URLSearchParams({
      apikey: CONFIG.OPENTRIPMAP_API_KEY
    })

    const response = await fetch(`${OPENTRIPMAP_BASE}/xid/${xid}?${params}`)

    if (!response.ok) {
      throw new Error(`OpenTripMap API lỗi: ${response.status}`)
    }

    const data = await response.json()

    return {
      xid,
      name: data.name,
      kinds: data.kinds,
      lat: data.point?.lat,
      lon: data.point?.lon,
      address: data.address?.road || data.address?.city || '',
      wikipedia: data.wikipedia || '',
      image: data.preview?.source || data.image || '',
      description:
        data.wikipedia_extracts?.text ||
        data.info?.descr ||
        data.otm ||
        null
    }
  }
}

export default new OpenTripMapService()
