import NominatimService from '../services/NominatimService.js'
import RoutingService from '../services/RoutingService.js'
import SearchControl from './SearchControl.js'
import { formatDistance, formatDuration, showToast } from '../utils/helpers.js'

export default class RoutingPanel {
  constructor(containerId, mapView, callbacks = {}) {
    this.container = document.getElementById(containerId)
    this.mapView = mapView
    this.onStartSelect = callbacks.onStartSelect || null
    this.onDestSelect = callbacks.onDestSelect || null
    this.startPoint = { name: '', lat: null, lon: null }
    this.endPoint = { name: '', lat: null, lon: null }
    this.startSearch = null
    this.endSearch = null
    this.render()
    this.initSearchControls()
    this.bindEvents()
  }

  render() {
    this.container.innerHTML = `
      <div class="routing-panel">
        <div class="routing-panel-header">
          <i class="bi bi-sign-turn-right panel-header-icon"></i>
          <span>Tìm đường</span>
        </div>
        <div class="routing-panel-body">

          <!-- START POINT -->
          <div class="routing-field">
            <div class="routing-field-label">
              <span class="routing-dot routing-dot-start"></span>
              Điểm đi
            </div>
            <div id="routing-start-search"></div>
            <div class="routing-actions-row">
              <button id="pick-start-btn" class="routing-action-btn" type="button">
                <i class="bi bi-crosshair2"></i> Chọn trên bản đồ
              </button>
              <button id="gps-start-btn" class="routing-action-btn" type="button">
                <i class="bi bi-geo-alt"></i> Vị trí hiện tại
              </button>
            </div>
          </div>

          <div class="routing-connector">
            <div class="routing-connector-line"></div>
            <button id="swap-btn" class="routing-swap-btn" title="Hoán đổi điểm đi/đến" type="button">
              <i class="bi bi-arrow-down-up"></i>
            </button>
          </div>

          <!-- END POINT -->
          <div class="routing-field">
            <div class="routing-field-label">
              <span class="routing-dot routing-dot-end"></span>
              Điểm đến
            </div>
            <div id="routing-end-search"></div>
            <div class="routing-actions-row">
              <button id="pick-dest-btn" class="routing-action-btn" type="button">
                <i class="bi bi-crosshair2"></i> Chọn trên bản đồ
              </button>
            </div>
          </div>

          <!-- CALCULATE -->
          <button id="route-btn" class="routing-btn-primary" type="button">
            <i class="bi bi-sign-turn-right-fill"></i>
            Tìm đường đi
          </button>

          <!-- RESULT -->
          <div id="route-result" class="route-result d-none">
            <div class="route-result-item">
              <i class="bi bi-rulers route-result-icon"></i>
              <div>
                <div class="route-result-label">Khoảng cách</div>
                <div id="route-distance" class="route-result-value">—</div>
              </div>
            </div>
            <div class="route-result-divider"></div>
            <div class="route-result-item">
              <i class="bi bi-clock route-result-icon"></i>
              <div>
                <div class="route-result-label">Thời gian</div>
                <div id="route-duration" class="route-result-value">—</div>
              </div>
            </div>
          </div>

          <div id="route-error" class="route-error d-none"></div>
        </div>
      </div>
    `
  }

  initSearchControls() {
    this.startSearch = new SearchControl('routing-start-search', {
      type: 'start',
      placeholder: 'Nhập điểm đi...',
      onSelect: async (place) => {
        const { lat, lon, displayName } = place
        this.startPoint = { name: displayName, lat, lon }
        this.mapView.setStartPoint(lat, lon)
        this.mapView.flyTo(lat, lon, 14)
        if (this.onStartSelect) {
          await this.onStartSelect(lat, lon, displayName)
        }
        showToast(`📍 Điểm đi: ${displayName}`)
      }
    })

    this.endSearch = new SearchControl('routing-end-search', {
      type: 'destination',
      placeholder: 'Nhập điểm đến...',
      onSelect: (place) => {
        const { lat, lon, displayName } = place
        this.endPoint = { name: displayName, lat, lon }
        this.mapView.setEndPoint(lat, lon)
        this.mapView.flyTo(lat, lon, 14)
        if (this.onDestSelect) {
          this.onDestSelect(lat, lon, displayName)
        }
        showToast(`🏁 Điểm đến: ${displayName}`)
      }
    })
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
  }

  setStartPoint(location) {
    this.startPoint = { name: location.name, lat: location.lat, lon: location.lon }
    this.startSearch?.setValue(location.name)
    if (location.lat != null && location.lon != null) {
      this.mapView.setStartPoint(location.lat, location.lon)
    }
  }

  setDestination(location) {
    this.endPoint = { name: location.name, lat: location.lat, lon: location.lon }
    this.endSearch?.setValue(location.name)
    if (location.lat != null && location.lon != null) {
      this.mapView.setEndPoint(location.lat, location.lon)
    }
  }

  // Keep setEndPoint as alias for compatibility
  setEndPoint(location) {
    this.setDestination(location)
  }

  swapLocations() {
    const temp = { ...this.startPoint }
    this.setStartPoint({ ...this.endPoint })
    this.setDestination(temp)
    this.clearRouteResult()
    this.mapView.clearRoute()
  }

  async handleMapPick(type, lat, lon) {
    try {
      const address = await NominatimService.reverseGeocode(lat, lon)
      const location = { name: address.display_name.split(',')[0], lat, lon }
      if (type === 'start') this.setStartPoint(location)
      else this.setDestination(location)
      showToast(`✅ Đã chọn ${type === 'start' ? 'điểm đi' : 'điểm đến'}`)
    } catch {
      const location = { name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon }
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
      showToast('❌ Vui lòng chọn điểm đi và điểm đến')
      return
    }

    const routeBtn = document.getElementById('route-btn')
    if (routeBtn) {
      routeBtn.disabled = true
      routeBtn.innerHTML = `<div class="spinner-border spinner-border-sm me-2"></div> Đang tìm...`
    }
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
      if (routeBtn) {
        routeBtn.disabled = false
        routeBtn.innerHTML = `<i class="bi bi-sign-turn-right-fill"></i> Tìm đường đi`
      }
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
      el.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>${message}`
      el.classList.remove('d-none')
    }
  }

  hideRouteError() {
    document.getElementById('route-error')?.classList.add('d-none')
  }

  clearAll() {
    this.startPoint = { name: '', lat: null, lon: null }
    this.endPoint = { name: '', lat: null, lon: null }
    this.startSearch?.clear()
    this.endSearch?.clear()
    this.clearRoute()
    this.deactivatePickButtons()
    this.mapView.setPickMode(null)
    this.mapView.clearRoutePoints()
  }
}