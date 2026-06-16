import { createLocation } from '../utils/helpers.js'

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

const VN_BOUNDS = {
  minLat: 8.0,
  maxLat: 23.5,
  minLon: 102.0,
  maxLon: 110.0
}

/**
 * Chuỗi waypoints DỌC THEO QUỐC LỘ 1A từ Nam → Bắc.
 * Đây là "xương sống" để OSRM không thoát ra ngoài lãnh thổ.
 * Mỗi điểm cách nhau ~50–80 km, đủ dày để OSRM không "nhảy" qua Lào/Campuchia.
 */
const QL1A = [
  { lat:  8.9500, lon: 105.0800, name: 'Năm Căn' },
  { lat:  9.1750, lon: 105.1500, name: 'Cà Mau' },
  { lat:  9.6000, lon: 105.6000, name: 'Bạc Liêu' },
  { lat: 10.0452, lon: 105.7469, name: 'Cần Thơ' },
  { lat: 10.3600, lon: 105.9800, name: 'Vĩnh Long' },
  { lat: 10.5800, lon: 106.2000, name: 'Mỹ Tho' },
  { lat: 10.8231, lon: 106.6297, name: 'TP.HCM' },
  { lat: 11.0700, lon: 106.9200, name: 'Biên Hòa' },
  { lat: 11.3400, lon: 107.0900, name: 'Bà Rịa' },
  { lat: 11.5400, lon: 107.2600, name: 'Phan Thiết (S)' },
  { lat: 11.9400, lon: 108.1100, name: 'Phan Thiết' },
  { lat: 12.2500, lon: 108.6600, name: 'Cam Ranh' },
  { lat: 12.5600, lon: 109.0000, name: 'Nha Trang' },
  { lat: 13.0827, lon: 109.0929, name: 'Tuy Hòa' },
  { lat: 13.7700, lon: 109.2200, name: 'Quy Nhơn' },
  { lat: 14.5400, lon: 108.9800, name: 'Quảng Ngãi' },
  { lat: 15.1200, lon: 108.8000, name: 'Tam Kỳ' },
  { lat: 15.8801, lon: 108.3380, name: 'Hội An' },
  { lat: 16.0544, lon: 108.2022, name: 'Đà Nẵng' },
  { lat: 16.4637, lon: 107.5909, name: 'Huế' },
  { lat: 16.8300, lon: 107.1000, name: 'Đông Hà' },
  { lat: 17.4682, lon: 106.5902, name: 'Đồng Hới' },
  { lat: 18.0700, lon: 106.3000, name: 'Hà Tĩnh (N)' },
  { lat: 18.3333, lon: 105.9000, name: 'Hà Tĩnh' },
  { lat: 18.6796, lon: 105.6813, name: 'Vinh' },
  { lat: 19.3300, lon: 105.7000, name: 'Thanh Hóa (S)' },
  { lat: 19.8067, lon: 105.7851, name: 'Thanh Hóa' },
  { lat: 20.2500, lon: 105.9700, name: 'Ninh Bình (S)' },
  { lat: 20.5144, lon: 106.3068, name: 'Ninh Bình' },
  { lat: 20.6900, lon: 106.0500, name: 'Nam Định' },
  { lat: 20.9200, lon: 106.3300, name: 'Hải Dương' },
  { lat: 21.0285, lon: 105.8412, name: 'Hà Nội' },
]

/**
 * Waypoints bổ sung cho các tuyến không đi QL1A
 * (Tây Bắc, Tây Nguyên, Đông Bắc)
 */
const REGIONAL = [
  { lat: 21.3860, lon: 103.0170, name: 'Điện Biên Phủ' },
  { lat: 22.3302, lon: 103.8400, name: 'Lào Cai' },
  { lat: 21.7000, lon: 104.8800, name: 'Yên Bái' },
  { lat: 21.8333, lon: 106.7614, name: 'Lạng Sơn' },
  { lat: 22.6667, lon: 106.2500, name: 'Cao Bằng' },
  { lat: 20.8449, lon: 106.6881, name: 'Hải Phòng' },
  { lat: 21.3900, lon: 105.2400, name: 'Hòa Bình' },
  { lat: 11.9404, lon: 108.4583, name: 'Đà Lạt' },
  { lat: 12.6667, lon: 108.0378, name: 'Buôn Ma Thuột' },
  { lat: 13.9833, lon: 108.0000, name: 'Pleiku' },
  { lat: 11.3500, lon: 106.1000, name: 'Tây Ninh' },
  { lat: 10.9400, lon: 106.8200, name: 'Vũng Tàu' },
]

const ALL_WAYPOINTS = [...QL1A, ...REGIONAL]

function isInsideVietnam(lat, lon) {
  return (
    lat >= VN_BOUNDS.minLat &&
    lat <= VN_BOUNDS.maxLat &&
    lon >= VN_BOUNDS.minLon &&
    lon <= VN_BOUNDS.maxLon
  )
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Chọn waypoints giữa start và end:
 * 1. Lọc các điểm nằm trong bounding box giữa 2 điểm (có padding)
 * 2. Tính projection t dọc theo đường start→end (chỉ lấy điểm "giữa")
 * 3. KHÔNG filter theo perpDist — để giữ lại các điểm ven biển miền Trung
 *    vốn lệch Đông so với đường thẳng Hà Nội→HCM
 * 4. Giới hạn tối đa 8 waypoints, ưu tiên trải đều dọc tuyến
 */
function selectWaypoints(startLat, startLon, endLat, endLon) {
  const directDistance = haversine(startLat, startLon, endLat, endLon)
  if (directDistance < 50) return []

  // Padding lớn hơn về phía Đông để bắt được các điểm ven biển
  const latPad = 0.8
  const lonPadWest = 0.3  // padding nhỏ về phía Tây (tránh kéo vào Lào)
  const lonPadEast = 1.5  // padding lớn về phía Đông (bắt được QL1A ven biển)

  const minLat = Math.min(startLat, endLat) - latPad
  const maxLat = Math.max(startLat, endLat) + latPad
  const minLon = Math.min(startLon, endLon) - lonPadWest
  const maxLon = Math.max(startLon, endLon) + lonPadEast

  const dxTotal = endLon - startLon
  const dyTotal = endLat - startLat
  const lenSq = dxTotal ** 2 + dyTotal ** 2

  const candidates = ALL_WAYPOINTS
    .filter((wp) => {
      if (wp.lat < minLat || wp.lat > maxLat) return false
      if (wp.lon < minLon || wp.lon > maxLon) return false

      // Chỉ lấy điểm nằm "giữa" (không quá gần 2 đầu)
      if (lenSq > 0) {
        const t = ((wp.lon - startLon) * dxTotal + (wp.lat - startLat) * dyTotal) / lenSq
        if (t < 0.05 || t > 0.95) return false
      }

      return true
    })
    .map((wp) => {
      const t = lenSq > 0
        ? ((wp.lon - startLon) * dxTotal + (wp.lat - startLat) * dyTotal) / lenSq
        : 0
      return { ...wp, t }
    })
    .sort((a, b) => a.t - b.t)

  // Lấy tối đa 8 waypoints, trải đều theo t để không dồn cụm
  if (candidates.length <= 8) return candidates

  const step = candidates.length / 8
  return Array.from({ length: 8 }, (_, i) => candidates[Math.floor(i * step)])
}

function validateRouteGeometry(coordinates) {
  const violating = coordinates.filter(([lon, lat]) => !isInsideVietnam(lat, lon))
  return {
    valid: violating.length === 0,
    violatingCount: violating.length,
    total: coordinates.length
  }
}

function buildOsrmUrl(coords) {
  const coordStr = coords.map(([lon, lat]) => `${lon},${lat}`).join(';')
  return `${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson`
}

class RoutingService {
  async getRoute(startLat, startLon, endLat, endLon) {
    if (!isInsideVietnam(startLat, startLon)) {
      throw new Error('Điểm đi không nằm trong lãnh thổ Việt Nam')
    }
    if (!isInsideVietnam(endLat, endLon)) {
      throw new Error('Điểm đến không nằm trong lãnh thổ Việt Nam')
    }

    const waypoints = selectWaypoints(startLat, startLon, endLat, endLon)

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

    const validation = validateRouteGeometry(coordinates)
    if (!validation.valid) {
      throw new Error(
        'Không thể tìm đường hợp lệ trong lãnh thổ Việt Nam. ' +
        'Vui lòng kiểm tra lại điểm đi và điểm đến.'
      )
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