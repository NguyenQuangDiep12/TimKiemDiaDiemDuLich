import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'ol/ol.css'

import './styles/style.css'

import MapView from './components/MapView.js'
import PlacesPanel from './components/PlacesPanel.js'
import MapControls from './components/MapControls.js'
import RoutingPanel from './components/RoutingPanel.js'

import NominatimService from './services/NominatimService.js'

import { showToast } from './utils/helpers.js'

class TourismMapApp {
  constructor() {
    this.app = document.getElementById('app')

    this.mapView = null
    this.routingPanel = null
    this.placesPanel = null
    this.mapControls = null

    this.currentLocation = null
  }

  async init() {
    this.renderLayout()

    await new Promise((resolve) => setTimeout(resolve, 100))

    await this.initializeComponents()

    console.log('WebGIS Tourism Explorer initialized')
  }

  renderLayout() {
    this.app.innerHTML = `
      <header>
        <div class="d-flex align-items-center gap-2">
          <i
            class="bi bi-globe-asia-australia"
            style="color: var(--accent); font-size: 1.5rem;"
          ></i>
          <div class="header-title">
            WebGIS <span>Tourism Explorer</span>
          </div>
        </div>

        <div class="header-sep"></div>

        <div class="header-location">
          <i class="bi bi-geo-alt-fill text-danger"></i>
          <span id="header-location-text">Chưa chọn vị trí</span>
        </div>
      </header>

      <div id="map-container">

        <div id="map"></div>

        <div id="left-sidebar">
          <div id="routing-panel"></div>
        </div>

        <div id="place-panel"></div>

        <div id="layer-toggle"></div>

        <div id="map-controls"></div>

        <div id="mouse-coords"></div>

        <div id="status-toast"></div>

      </div>
    `
  }

  async initializeComponents() {
    // MAP
    this.mapView = new MapView('map')
    await this.mapView.init()

    // ROUTING (now includes integrated search controls)
    this.routingPanel = new RoutingPanel(
      'routing-panel',
      this.mapView,
      {
        onStartSelect: async (lat, lon, displayName) => {
          this.setCurrentLocation(lat, lon, displayName)
          this.mapView.clearMarkers()
          this.mapView.addMarker(lat, lon)
          this.mapView.flyTo(lat, lon, 15)
          try {
            await this.placesPanel.loadNearbyPlaces(lat, lon)
          } catch {
            showToast('❌ Không thể tải dữ liệu địa điểm tại vùng này')
          }
        },
        onDestSelect: (lat, lon, displayName) => {
          this.mapView.addMarker(lat, lon)
          this.mapView.flyTo(lat, lon, 15)
        }
      }
    )

    // PLACES PANEL
    this.placesPanel = new PlacesPanel(
      'place-panel',
      this.mapView,
      this.routingPanel
    )

    // MAP CONTROLS
    this.mapControls = new MapControls(
      'map-controls',
      'layer-toggle',
      this.mapView,
      this.placesPanel,
      this.routingPanel,
      null,
      (lat, lon, label) => this.setCurrentLocation(lat, lon, label),
      () => this.resetAppState()
    )

    // MAP CLICK
    this.mapView.setMapClickCallback(async (lat, lon) => {
      showToast('📍 Đang tìm địa điểm du lịch xung quanh...')
      try {
        await this.handleLocationSelected(lat, lon)
        showToast('✨ Đã tải danh sách địa điểm du lịch!')
      } catch {
        showToast('❌ Không thể tải dữ liệu địa điểm tại vùng này')
      }
    })

    // MARKER CLICK
    this.mapView.setMarkerClickCallback((place) => {
      this.placesPanel.showPlaceDetails(place)
    })

    // MAP PICK ROUTING
    this.mapView.setMapPickCallback((type, lat, lon) => {
      this.routingPanel.handleMapPick(type, lat, lon)
    })
  }

  async handleLocationSelected(lat, lon) {
    try {
      const address = await NominatimService.reverseGeocode(lat, lon)
      this.setCurrentLocation(lat, lon, address.display_name.split(',')[0])
    } catch {
      this.setCurrentLocation(lat, lon, `Tọa độ: ${lat.toFixed(4)}, ${lon.toFixed(4)}`)
    }
    await this.placesPanel.loadNearbyPlaces(lat, lon)
  }

  setCurrentLocation(lat, lon, label) {
    this.currentLocation = { lat, lon, name: label }
    const locationText = document.getElementById('header-location-text')
    if (locationText) locationText.textContent = label
  }

  resetAppState() {
    this.currentLocation = null
    const locationText = document.getElementById('header-location-text')
    if (locationText) locationText.textContent = 'Chưa chọn vị trí'
    this.mapView.resetView()
  }
}

const app = new TourismMapApp()
app.init()
export default app