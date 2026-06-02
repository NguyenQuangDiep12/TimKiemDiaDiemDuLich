import NominatimService from '../services/NominatimService.js'
import RoutingService from '../services/RoutingService.js'
import { formatDistance, formatDuration, showToast } from '../utils/helpers.js'

export default class RoutingPanel {
  constructor(containerId, mapView) {
    this.container = document.getElementById(containerId)
    this.mapView = mapView
    this.startPoint = { name: '', lat: null, lon: null }
    this.endPoint = { name: '', lat: null, lon: null }
    this.render()
    this.bindEvents()
  }

  render() {
    this.container.innerHTML = `
      <div class="routing-panel">
        <div class="routing-panel-header">
          <h6><i class="bi bi-sign-turn-right"></i> Tìm đường</h6>
        </div>
        <div class="routing-panel-body">
          <label class="routing-label">Điểm đi</label>
          <input type="text" id="start-input" class="routing-input" placeholder="Nhập điểm đi..." />
          <div class="routing-actions-row">
            <button id="pick-start-btn" class="routing-action-btn">
              <i class="bi bi-crosshair"></i> Chọn từ bản đồ
            </button>
            <button id="gps-start-btn" class="routing-action-btn">
              <i class="bi bi-geo-alt"></i> Dùng vị trí hiện tại
            </button>
          </div>

          <div class="routing-divider"></div>

          <label class="routing-label">Điểm đến</label>
          <input type="text" id="dest-input" class="routing-input" placeholder="Nhập điểm đến..." />
          <div class="routing-actions-row">
            <button id="pick-dest-btn" class="routing-action-btn">
              <i class="bi bi-crosshair"></i> Chọn từ bản đồ
            </button>
          </div>

          <div class="routing-divider"></div>

          <div class="routing-btn-row">
            <button id="swap-btn" class="routing-btn routing-btn-outline" title="Hoán đổi">
              <i class="bi bi-arrow-down-up"></i> Hoán đổi
            </button>
            <button id="route-btn" class="routing-btn routing-btn-primary">
              <i class="bi bi-sign-turn-right-fill"></i> Tìm đường
            </button>
          </div>

          <div id="route-result" class="route-result d-none">
            <div class="route-result-item">
              <span class="route-result-label">Khoảng cách</span>
              <span id="route-distance" class="route-result-value">—</span>
            </div>
            <div class="route-result-item">
              <span class="route-result-label">Thời gian</span>
              <span id="route-duration" class="route-result-value">—</span>
            </div>
          </div>
          <div id="route-error" class="route-error d-none"></div>
        </div>
      </div>
    `
  }

  bindEvents() {
    document.getElementById('pick-start-btn')?.addEventListener('click', () => {
      this.mapView.setPickMode('start')
      this.setPickButtonActive('start')
      showToast('📍 Click bản đồ để chọn điểm đi')
    })

    document.getElementById('pick-dest-btn')?.addEventListener('click', () => {
      this.mapView.setPickMode('end')
      this.setPickButtonActive('end')
      showToast('📍 Click bản đồ để chọn điểm đến')
    })

    document.getElementById('gps-start-btn')?.addEventListener('click', () => this.useCurrentLocation())
    document.getElementById('swap-btn')?.addEventListener('click', () => this.swapLocations())
    document.getElementById('route-btn')?.addEventListener('click', () => this.calculateRoute())

    document.getElementById('start-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.geocodeInput('start')
    })
    document.getElementById('dest-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.geocodeInput('end')
    })
  }

  setStartPoint(location) {
    this.startPoint = { name: location.name, lat: location.lat, lon: location.lon }
    const input = document.getElementById('start-input')
    if (input) input.value = location.name
    if (location.lat != null && location.lon != null) {
      this.mapView.setStartPoint(location.lat, location.lon)
    }
  }

  setDestination(location) {
    this.endPoint = { name: location.name, lat: location.lat, lon: location.lon }
    const input = document.getElementById('dest-input')
    if (input) input.value = location.name
    if (location.lat != null && location.lon != null) {
      this.mapView.setEndPoint(location.lat, location.lon)
    }
  }

  swapLocations() {
    const temp = { ...this.startPoint }
    this.setStartPoint({ ...this.endPoint })
    this.setDestination(temp)
    this.clearRouteResult()
    this.mapView.clearRoute()
  }

  async geocodeInput(type) {
    const inputId = type === 'start' ? 'start-input' : 'dest-input'
    const query = document.getElementById(inputId)?.value?.trim()
    if (!query) return

    try {
      const results = await NominatimService.search(query)
      const loc = {
        name: results[0].display_name,
        lat: results[0].lat,
        lon: results[0].lon
      }
      if (type === 'start') this.setStartPoint(loc)
      else this.setDestination(loc)
    } catch (error) {
      showToast(`❌ ${error.message}`)
    }
  }

  async handleMapPick(type, lat, lon) {
    try {
      const address = await NominatimService.reverseGeocode(lat, lon)
      const location = {
        name: address.display_name,
        lat,
        lon
      }
      if (type === 'start') this.setStartPoint(location)
      else this.setDestination(location)
      showToast(`✅ Đã chọn ${type === 'start' ? 'điểm đi' : 'điểm đến'}`)
    } catch {
      const location = {
        name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        lat,
        lon
      }
      if (type === 'start') this.setStartPoint(location)
      else this.setDestination(location)
    }
    this.deactivatePickButtons()
  }

  setPickButtonActive(type) {
    document.getElementById('pick-start-btn')?.classList.toggle('active', type === 'start')
    document.getElementById('pick-dest-btn')?.classList.toggle('active', type === 'end')
  }

  deactivatePickButtons() {
    document.getElementById('pick-start-btn')?.classList.remove('active')
    document.getElementById('pick-dest-btn')?.classList.remove('active')
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      showToast('❌ Trình duyệt không hỗ trợ định vị GPS')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lon } = position.coords
        this.setStartPoint({ name: 'Vị trí hiện tại', lat, lon })
        this.mapView.flyTo(lat, lon, 15)
        showToast('✅ Đã đặt vị trí hiện tại làm điểm đi')
      },
      (error) => {
        const messages = {
          1: 'Bạn đã từ chối quyền truy cập vị trí',
          2: 'Không thể xác định vị trí',
          3: 'Hết thời gian chờ định vị'
        }
        showToast(`❌ ${messages[error.code] || 'Lỗi định vị GPS'}`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async calculateRoute() {
    if (this.startPoint.lat == null || this.endPoint.lat == null) {
      if (!document.getElementById('start-input')?.value) await this.geocodeInput('start')
      if (!document.getElementById('dest-input')?.value) await this.geocodeInput('end')
    }

    if (this.startPoint.lat == null || this.endPoint.lat == null) {
      showToast('❌ Vui lòng chọn điểm đi và điểm đến')
      return
    }

    const routeBtn = document.getElementById('route-btn')
    routeBtn.disabled = true
    this.hideRouteError()
    document.getElementById('route-result')?.classList.add('d-none')

    try {
      const route = await RoutingService.getRoute(
        this.startPoint.lat,
        this.startPoint.lon,
        this.endPoint.lat,
        this.endPoint.lon
      )

      route.startLocation.name = this.startPoint.name
      route.endLocation.name = this.endPoint.name

      this.mapView.drawRoute(route)
      this.renderResult(route.distance, route.duration)
      showToast('✅ Đã tìm thấy tuyến đường!')
    } catch (error) {
      this.showRouteError(error.message)
      showToast(`❌ ${error.message}`)
    } finally {
      routeBtn.disabled = false
    }
  }

  renderResult(distance, duration) {
    const resultEl = document.getElementById('route-result')
    resultEl?.classList.remove('d-none')
    const distEl = document.getElementById('route-distance')
    const durEl = document.getElementById('route-duration')
    if (distEl) distEl.textContent = formatDistance(distance)
    if (durEl) durEl.textContent = formatDuration(duration)
  }

  clearRoute() {
    this.mapView.clearRoute()
    this.clearRouteResult()
  }

  clearRouteResult() {
    document.getElementById('route-result')?.classList.add('d-none')
    this.hideRouteError()
  }

  showRouteError(message) {
    const el = document.getElementById('route-error')
    if (el) {
      el.textContent = message
      el.classList.remove('d-none')
    }
  }

  hideRouteError() {
    document.getElementById('route-error')?.classList.add('d-none')
  }

  clearAll() {
    this.startPoint = { name: '', lat: null, lon: null }
    this.endPoint = { name: '', lat: null, lon: null }

    const startInput = document.getElementById('start-input')
    const destInput = document.getElementById('dest-input')
    if (startInput) startInput.value = ''
    if (destInput) destInput.value = ''

    this.clearRoute()
    this.deactivatePickButtons()
    this.mapView.setPickMode(null)
  }
}
