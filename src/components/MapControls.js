import { MAP_LAYERS } from '../utils/constants.js'
import { showToast } from '../utils/helpers.js'

const LAYER_ORDER = [MAP_LAYERS.OSM, MAP_LAYERS.SATELLITE, MAP_LAYERS.TERRAIN]
const LAYER_LABELS = {
  [MAP_LAYERS.OSM]: 'Bản đồ',
  [MAP_LAYERS.SATELLITE]: 'Vệ tinh',
  [MAP_LAYERS.TERRAIN]: 'Địa hình'
}

export default class MapControls {
  constructor(controlsId, layerToggleId, mapView, placesPanel, routingPanel, searchControl, onLocationUpdate, onClear) {
    this.controlsContainer = document.getElementById(controlsId)
    this.layerToggleContainer = document.getElementById(layerToggleId)
    this.mapView = mapView
    this.placesPanel = placesPanel
    this.routingPanel = routingPanel
    this.searchControl = searchControl
    this.onLocationUpdate = onLocationUpdate
    this.onClear = onClear
    this.currentLayerIndex = 0
    this.renderControls()
    this.renderLayerToggle()
  }

  renderControls() {
    this.controlsContainer.innerHTML = `
      <div class="map-controls-group">
        <button id="zoom-in-btn" class="map-control-btn ol-zoom-in" type="button" title="Phóng to" aria-label="Phóng to">
          <i class="bi bi-plus-lg"></i>
        </button>
        <button id="zoom-out-btn" class="map-control-btn ol-zoom-out" type="button" title="Thu nhỏ" aria-label="Thu nhỏ">
          <i class="bi bi-dash-lg"></i>
        </button>
        <div class="control-divider"></div>
        <button id="my-location-btn" class="map-control-btn" type="button" title="Vị trí của tôi" aria-label="Vị trí của tôi">
          <i class="bi bi-geo-alt-fill"></i>
        </button>
        <button id="clear-map-btn" class="map-control-btn map-control-btn-clear" type="button" title="Xóa tất cả trên bản đồ" aria-label="Xóa tất cả">
          <i class="bi bi-eraser-fill"></i>
        </button>
      </div>
    `

    document.getElementById('zoom-in-btn')?.addEventListener('click', () => this.zoomIn())
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => this.zoomOut())
    document.getElementById('my-location-btn')?.addEventListener('click', () => this.locateUser())
    document.getElementById('clear-map-btn')?.addEventListener('click', () => this.clearMap())
  }

  renderLayerToggle() {
    this.layerToggleContainer.innerHTML = `
      <button id="layer-toggle-btn" class="layer-toggle-btn" type="button" title="Chuyển lớp bản đồ">
        <i class="bi bi-layers"></i>
        <span id="layer-label">${LAYER_LABELS[MAP_LAYERS.OSM]}</span>
      </button>
    `

    document.getElementById('layer-toggle-btn')?.addEventListener('click', () => {
      this.currentLayerIndex = (this.currentLayerIndex + 1) % LAYER_ORDER.length
      this.switchLayer(LAYER_ORDER[this.currentLayerIndex])
    })
  }

  zoomIn() {
    this.mapView.zoomIn()
  }

  zoomOut() {
    this.mapView.zoomOut()
  }

  switchLayer(layerName) {
    this.mapView.switchLayer(layerName)
    const label = document.getElementById('layer-label')
    if (label) label.textContent = LAYER_LABELS[layerName]
  }

  clearMap() {
    this.mapView.clearAll()
    this.routingPanel.clearAll()
    this.placesPanel.reset()
    this.searchControl?.clear()
    this.onClear?.()
    showToast('🧹 Đã xóa tất cả marker, tuyến đường và lựa chọn trên bản đồ')
  }

  locateUser() {
    if (!navigator.geolocation) {
      showToast('❌ Trình duyệt không hỗ trợ định vị GPS')
      return
    }

    const btn = document.getElementById('my-location-btn')
    btn?.classList.add('loading')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        btn?.classList.remove('loading')
        const { latitude: lat, longitude: lon } = position.coords

        this.mapView.addMarker(lat, lon)
        this.mapView.flyTo(lat, lon, 15)
        this.onLocationUpdate?.(lat, lon, 'Vị trí hiện tại')

        this.routingPanel.setStartPoint({ name: 'Vị trí hiện tại', lat, lon })

        try {
          await this.placesPanel.loadNearbyPlaces(lat, lon)
          showToast('✨ Đã định vị và tải địa điểm du lịch xung quanh!')
        } catch {
          showToast('❌ Không thể tải dữ liệu địa điểm xung quanh')
        }
      },
      (error) => {
        btn?.classList.remove('loading')
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
}
