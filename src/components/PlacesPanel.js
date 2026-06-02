import OpenTripMapService from '../services/OpenTripMapService.js'
import { formatKinds, formatDistance, escapeHtml, showToast } from '../utils/helpers.js'

export default class PlacesPanel {
  constructor(containerId, mapView, routingPanel) {
    this.container = document.getElementById(containerId)
    this.mapView = mapView
    this.routingPanel = routingPanel
    this.places = []
    this.currentPlace = null
    this.render()
  }

  render() {
    this.container.innerHTML = `
      <div class="places-panel">
        <div class="places-panel-header">
          <h5><i class="bi bi-compass"></i> Địa điểm du lịch</h5>
          <span id="places-count" class="places-count">0 địa điểm</span>
        </div>
        <div id="places-loading" class="places-loading d-none">
          <div class="spinner-border text-primary" role="status"></div>
          <p>Đang tìm kiếm địa điểm xung quanh...</p>
        </div>
        <div id="places-list" class="places-list">
          <div class="places-empty">
            <i class="bi bi-pin-map"></i>
            <p>Click bản đồ, tìm kiếm hoặc dùng GPS để khám phá địa điểm du lịch xung quanh</p>
          </div>
        </div>
        <div id="place-details" class="place-details d-none"></div>
      </div>
    `
  }

  async loadNearbyPlaces(lat, lon) {
    this.setLoading(true)
    this.hideDetails()

    try {
      this.places = await OpenTripMapService.getNearbyPlaces(lat, lon)
      this.renderPlaces()
      this.mapView.addPlaceMarkers(this.places)

      if (this.places.length === 0) {
        this.showEmpty('Không tìm thấy địa điểm du lịch trong bán kính 5km')
      }
    } catch (error) {
      this.showEmpty(`Lỗi: ${error.message}`)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  setLoading(loading) {
    const loadingEl = document.getElementById('places-loading')
    const listEl = document.getElementById('places-list')
    if (loadingEl) loadingEl.classList.toggle('d-none', !loading)
    if (listEl) listEl.classList.toggle('d-none', loading)
  }

  renderPlaces() {
    const listEl = document.getElementById('places-list')
    const countEl = document.getElementById('places-count')

    if (countEl) countEl.textContent = `${this.places.length} địa điểm`
    if (!this.places.length) return

    listEl.innerHTML = this.places
      .map(
        (place, i) => `
        <div class="place-item" data-index="${i}">
          <button class="place-item-main" data-action="details" data-index="${i}">
            <div class="place-item-icon">
              <i class="bi bi-geo-alt-fill"></i>
            </div>
            <div class="place-item-info">
              <div class="place-item-name">${escapeHtml(place.name)}</div>
              <div class="place-item-meta">
                <span class="place-type">${formatKinds(place.kinds)}</span>
                ${place.dist != null ? `<span class="place-dist"><i class="bi bi-signpost-2"></i> ${formatDistance(place.dist)}</span>` : ''}
              </div>
            </div>
            <i class="bi bi-chevron-right place-item-arrow"></i>
          </button>
          <div class="place-item-actions">
            <button class="place-action-btn" data-action="start" data-index="${i}" title="Đặt làm điểm đi">
              <i class="bi bi-circle-fill text-success"></i>
            </button>
            <button class="place-action-btn" data-action="dest" data-index="${i}" title="Đặt làm điểm đến">
              <i class="bi bi-geo-alt-fill text-warning"></i>
            </button>
          </div>
        </div>
      `
      )
      .join('')

    listEl.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const index = parseInt(btn.dataset.index, 10)
        const place = this.places[index]
        const action = btn.dataset.action

        if (action === 'details') await this.showPlaceDetails(place)
        else if (action === 'start') this.setAsStart(place)
        else if (action === 'dest') this.setAsDestination(place)
      })
    })
  }

  async showPlaceDetails(place) {
    this.currentPlace = place
    const detailsEl = document.getElementById('place-details')
    const listEl = document.getElementById('places-list')

    listEl?.classList.add('d-none')
    detailsEl?.classList.remove('d-none')
    detailsEl.innerHTML = `
      <div class="place-details-loading">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <span>Đang tải thông tin...</span>
      </div>
    `

    this.mapView.showPlaceOnMap(place)

    try {
      const details = await OpenTripMapService.getPlaceDetails(place.xid)
      this.renderPlaceDetailsContent(place, details)
    } catch {
      this.renderPlaceDetailsContent(place, null)
    }
  }

  renderPlaceDetailsContent(place, details) {
    const detailsEl = document.getElementById('place-details')
    const name = escapeHtml(details?.name || place.name)
    const kinds = formatKinds(details?.kinds || place.kinds)
    const lat = details?.lat ?? place.lat
    const lon = details?.lon ?? place.lon
    const description = details?.description
    const image = details?.image

    detailsEl.innerHTML = `
      <button class="place-back-btn" id="place-back-btn">
        <i class="bi bi-arrow-left"></i> Quay lại
      </button>
      <div class="place-details-content">
        ${image ? `<img src="${escapeHtml(image)}" class="place-detail-image" alt="${name}" />` : ''}
        <h5>${name}</h5>
        <div class="place-detail-tags">
          <span class="badge bg-primary">${kinds}</span>
        </div>
        <div class="place-detail-coords">
          <i class="bi bi-geo"></i> ${lat.toFixed(4)}, ${lon.toFixed(4)}
        </div>
        ${description ? `<p class="place-detail-desc">${escapeHtml(description)}</p>` : '<p class="place-detail-desc text-muted">Không có mô tả chi tiết.</p>'}
        <div class="place-detail-actions">
          <button id="set-start-btn" class="place-detail-btn place-detail-btn-start">
            <i class="bi bi-circle-fill"></i> Điểm đi
          </button>
          <button id="set-dest-btn" class="place-detail-btn place-detail-btn-dest">
            <i class="bi bi-geo-alt-fill"></i> Điểm đến
          </button>
          <button id="get-directions-btn" class="place-detail-btn place-detail-btn-route">
            <i class="bi bi-sign-turn-right-fill"></i> Tìm đường
          </button>
        </div>
      </div>
    `

    document.getElementById('place-back-btn')?.addEventListener('click', () => this.hideDetails())
    document.getElementById('set-start-btn')?.addEventListener('click', () => this.setAsStart(place))
    document.getElementById('set-dest-btn')?.addEventListener('click', () => this.setAsDestination(place))
    document.getElementById('get-directions-btn')?.addEventListener('click', () => this.getDirections(place))
  }

  setAsStart(place) {
    this.routingPanel.setStartPoint({
      name: place.name,
      lat: place.lat,
      lon: place.lon
    })
    showToast(`✅ Đã đặt "${place.name}" làm điểm đi`)
  }

  setAsDestination(place) {
    this.routingPanel.setDestination({
      name: place.name,
      lat: place.lat,
      lon: place.lon
    })
    showToast(`✅ Đã đặt "${place.name}" làm điểm đến`)
  }

  getDirections(place) {
    this.setAsDestination(place)
    this.routingPanel.calculateRoute()
  }

  hideDetails() {
    document.getElementById('place-details')?.classList.add('d-none')
    document.getElementById('places-list')?.classList.remove('d-none')
    this.mapView.hidePopup()
    this.currentPlace = null
  }

  showEmpty(message) {
    document.getElementById('places-list').innerHTML = `
      <div class="places-empty">
        <i class="bi bi-search"></i>
        <p>${message}</p>
      </div>
    `
  }

  reset() {
    this.places = []
    this.currentPlace = null
    this.hideDetails()

    const countEl = document.getElementById('places-count')
    if (countEl) countEl.textContent = '0 địa điểm'

    document.getElementById('places-list').innerHTML = `
      <div class="places-empty">
        <i class="bi bi-pin-map"></i>
        <p>Click bản đồ, tìm kiếm hoặc dùng GPS để khám phá địa điểm du lịch xung quanh</p>
      </div>
    `
  }
}
