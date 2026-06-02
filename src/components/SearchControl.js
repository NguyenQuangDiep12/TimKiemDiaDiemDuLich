import NominatimService from '../services/NominatimService.js'

export default class SearchControl {
  constructor(containerId, mapView, placesPanel, onLocationUpdate) {
    this.container = document.getElementById(containerId)
    this.mapView = mapView
    this.placesPanel = placesPanel
    this.onLocationUpdate = onLocationUpdate
    this.isLoading = false
    this.render()
    this.bindEvents()
  }

  render() {
    this.container.innerHTML = `
      <div class="search-box">
        <i class="bi bi-search search-icon"></i>
        <input
          type="text"
          id="search-input"
          class="search-input"
          placeholder="Tìm kiếm địa điểm (VD: Hồ Gươm, Văn Miếu, Hạ Long...)"
          autocomplete="off"
        />
        <button id="search-clear-btn" class="search-clear-btn d-none" title="Xóa">
          <i class="bi bi-x-lg"></i>
        </button>
        <button id="search-btn" class="search-btn" title="Tìm kiếm">
          <i class="bi bi-arrow-right"></i>
        </button>
        <div id="search-loading" class="search-loading d-none">
          <div class="spinner-border spinner-border-sm" role="status"></div>
        </div>
      </div>
      <div id="search-results" class="search-results"></div>
    `
  }

  bindEvents() {
    const input = document.getElementById('search-input')
    const btn = document.getElementById('search-btn')
    const clearBtn = document.getElementById('search-clear-btn')

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.search()
    })

    input?.addEventListener('input', () => {
      clearBtn?.classList.toggle('d-none', !input.value)
    })

    btn?.addEventListener('click', () => this.search())
    clearBtn?.addEventListener('click', () => this.clear())
  }

  setLoading(loading) {
    this.isLoading = loading
    const loadingEl = document.getElementById('search-loading')
    const btn = document.getElementById('search-btn')
    if (loadingEl) loadingEl.classList.toggle('d-none', !loading)
    if (btn) btn.disabled = loading
  }

  async search(keyword) {
    const input = document.getElementById('search-input')
    const query = (keyword ?? input?.value)?.trim()
    const resultsEl = document.getElementById('search-results')

    if (!query) {
      this.showError('Vui lòng nhập tên địa điểm')
      return
    }

    this.setLoading(true)
    resultsEl.innerHTML = ''

    try {
      const results = await NominatimService.search(query)

      if (results.length === 1) {
        await this.selectResult(results[0])
      } else {
        this.renderResults(results)
      }
    } catch (error) {
      this.showError(error.message)
    } finally {
      this.setLoading(false)
    }
  }

  clear() {
    const input = document.getElementById('search-input')
    const resultsEl = document.getElementById('search-results')
    const clearBtn = document.getElementById('search-clear-btn')

    if (input) input.value = ''
    if (resultsEl) resultsEl.innerHTML = ''
    clearBtn?.classList.add('d-none')
  }

  renderResults(results) {
    const resultsEl = document.getElementById('search-results')
    resultsEl.innerHTML = results
      .map(
        (r, i) => `
        <button class="search-result-item" data-index="${i}">
          <i class="bi bi-geo-alt"></i>
          <span>${r.display_name}</span>
        </button>
      `
      )
      .join('')

    resultsEl.querySelectorAll('.search-result-item').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const index = parseInt(btn.dataset.index, 10)
        await this.selectResult(results[index])
      })
    })
  }

  async selectResult(result) {
    const resultsEl = document.getElementById('search-results')
    resultsEl.innerHTML = ''

    this.mapView.clearMarkers()
    this.mapView.addMarker(result.lat, result.lon)
    this.mapView.flyTo(result.lat, result.lon, 15)

    const label = result.display_name.split(',')[0]
    this.onLocationUpdate?.(result.lat, result.lon, label)

    await this.placesPanel.loadNearbyPlaces(result.lat, result.lon)
  }

  showError(message) {
    const resultsEl = document.getElementById('search-results')
    resultsEl.innerHTML = `<div class="search-error"><i class="bi bi-exclamation-circle"></i> ${message}</div>`
  }
}
