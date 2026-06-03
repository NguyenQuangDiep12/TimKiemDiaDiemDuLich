import { createLocation } from '../utils/helpers.js'

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

// Bounding box lãnh thổ Việt Nam (có padding nhỏ)
const VN_BOUNDS = {
  minLat: 8.18,
  maxLat: 23.39,
  minLon: 102.14,
  maxLon: 109.47
}

// Waypoints trung gian theo vĩ độ để buộc route đi dọc Việt Nam
// Sắp xếp từ Nam → Bắc
const VN_WAYPOINTS = [
  { lat: 10.8231, lon: 106.6297, name: 'TP.HCM' },   // TP.HCM
  { lat: 11.9404, lon: 108.4583, name: 'Đà Lạt' },    // Đà Lạt / Tây Nguyên
  { lat: 13.0827, lon: 109.0929, name: 'Tuy Hòa' },   // Duyên hải miền Trung
  { lat: 16.0544, lon: 108.2022, name: 'Đà Nẵng' },   // Đà Nẵng
  { lat: 17.4682, lon: 106.5902, name: 'Đồng Hới' },  // Quảng Bình
  { lat: 20.8449, lon: 106.6881, name: 'Hải Phòng' }, // Hải Phòng
  { lat: 21.0285, lon: 105.8412, name: 'Hà Nội' }     // Hà Nội
]

function isInsideVietnam(lat, lon) {
  return (
    lat >= VN_BOUNDS.minLat &&
    lat <= VN_BOUNDS.maxLat &&
    lon >= VN_BOUNDS.minLon &&
    lon <= VN_BOUNDS.maxLon
  )
}

function validateRouteGeometry(coordinates) {
  // Kiểm tra tất cả tọa độ trong route có nằm trong lãnh thổ VN không
  const violatingPoints = coordinates.filter(([lon, lat]) => !isInsideVietnam(lat, lon))
  return {
    valid: violatingPoints.length === 0,
    violatingCount: violatingPoints.length,
    total: coordinates.length
  }
}

function selectWaypoints(startLat, startLon, endLat, endLon) {
  // Chỉ thêm waypoint nằm giữa điểm đi và điểm đến theo vĩ độ
  const minLat = Math.min(startLat, endLat)
  const maxLat = Math.max(startLat, endLat)
  const latSpan = maxLat - minLat

  // Chỉ thêm waypoint nếu khoảng cách đủ lớn (> 2 độ vĩ độ ≈ ~220km)
  if (latSpan < 2) return []

  return VN_WAYPOINTS.filter(
    (wp) => wp.lat > minLat + 0.5 && wp.lat < maxLat - 0.5
  )
}

function buildOsrmUrl(coords) {
  // coords: mảng [lon, lat]
  const coordStr = coords.map(([lon, lat]) => `${lon},${lat}`).join(';')
  return `${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson`
}

class RoutingService {
  async getRoute(startLat, startLon, endLat, endLon) {
    // Chọn waypoints trung gian phù hợp
    const waypoints = selectWaypoints(startLat, startLon, endLat, endLon)

    // Xây dựng danh sách tọa độ: start → waypoints → end
    const allCoords = [
      [startLon, startLat],
      ...waypoints.map((wp) => [wp.lon, wp.lat]),
      [endLon, endLat]
    ]

    const url = buildOsrmUrl(allCoords)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Routing API lỗi: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes?.length) {
      throw new Error('Không tìm thấy tuyến đường phù hợp')
    }

    const route = data.routes[0]
    const coordinates = route.geometry.coordinates

    // Validate: kiểm tra route có vượt biên giới không
    const validation = validateRouteGeometry(coordinates)

    if (!validation.valid) {
      // Thử lại với nhiều waypoints hơn nếu route hợp lệ < 90%
      const ratio = validation.violatingCount / validation.total
      if (ratio > 0.1) {
        throw new Error(
          `Không thể tìm đường hợp lệ trong lãnh thổ Việt Nam. ` +
          `Vui lòng kiểm tra lại điểm đi và điểm đến.`
        )
      }
    }

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