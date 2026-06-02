import { createLocation } from '../utils/helpers.js'

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

class RoutingService {
  async getRoute(startLat, startLon, endLat, endLon) {
    const url = `${OSRM_BASE}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Routing API lỗi: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes?.length) {
      throw new Error('Không tìm thấy tuyến đường phù hợp')
    }

    const route = data.routes[0]

    return {
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      startLocation: createLocation('', startLat, startLon),
      endLocation: createLocation('', endLat, endLon)
    }
  }
}

export default new RoutingService()
