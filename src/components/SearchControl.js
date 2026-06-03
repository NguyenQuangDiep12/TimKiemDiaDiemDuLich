export default class SearchControl {
  constructor(containerId, options = {}) {
    this.containerId = containerId

    this.type = options.type || 'location' // start | destination
    this.onSelect = options.onSelect || null

    this.placeholder =
      options.placeholder ||
      (this.type === 'start'
        ? 'Nhập điểm đi...'
        : this.type === 'destination'
          ? 'Nhập điểm đến...'
          : 'Tìm kiếm địa điểm...')

    this.limit = options.limit || 8
    this.countryCode =
      options.countryCode !== undefined
        ? options.countryCode
        : 'vn'

    this.lang = options.lang || 'vi'
    this.debounceMs = options.debounce || 450
    this.minLength = options.minLength || 2

    this._timer = null
    this._abortController = null
    this._activeIndex = -1
    this._cache = new Map()

    this._build()
  }

  // BUILD UI

  _build() {
    const container = document.getElementById(this.containerId)

    if (!container) {
      console.error(
        `[SearchControl] Container #${this.containerId} not found`
      )
      return
    }

    container.className = 'search-control-container'

    const icon =
      this.type === 'start'
        ? 'bi-geo-alt-fill'
        : this.type === 'destination'
          ? 'bi-flag-fill'
          : 'bi-search'

    container.innerHTML = `
      <div
        class="search-control-wrapper"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <i class="bi ${icon} search-icon"></i>

        <input
          type="text"
          id="search-input-${this.containerId}"
          class="search-input"
          placeholder="${this._escHtml(this.placeholder)}"
          autocomplete="off"
          spellcheck="false"
          aria-label="${this._escHtml(this.placeholder)}"
        />

        <button
          class="search-clear-btn"
          id="search-clear-${this.containerId}"
          style="display:none"
          aria-label="Xóa tìm kiếm"
        >
          <i class="bi bi-x-lg"></i>
        </button>

        <div
          class="search-loading"
          id="search-loading-${this.containerId}"
          style="display:none"
        >
          <div class="spinner-border spinner-border-sm"></div>
        </div>
      </div>

      <ul
        class="search-dropdown"
        id="search-dropdown-${this.containerId}"
        role="listbox"
        style="display:none"
      ></ul>
    `

    this._container = container

    this._wrapper = container.querySelector(
      '.search-control-wrapper'
    )

    this._input = document.getElementById(
      `search-input-${this.containerId}`
    )

    this._dropdown = document.getElementById(
      `search-dropdown-${this.containerId}`
    )

    this._clearBtn = document.getElementById(
      `search-clear-${this.containerId}`
    )

    this._loading = document.getElementById(
      `search-loading-${this.containerId}`
    )

    this._bindEvents()
  }

  // EVENTS

  _bindEvents() {
    this._handleInput = this._onInput.bind(this)
    this._handleKeydown = this._onKeydown.bind(this)
    this._handleOutsideClick =
      this._onOutsideClick.bind(this)

    this._input.addEventListener(
      'input',
      this._handleInput
    )

    this._input.addEventListener(
      'keydown',
      this._handleKeydown
    )

    this._clearBtn.addEventListener('click', () =>
      this.clear()
    )

    document.addEventListener(
      'click',
      this._handleOutsideClick
    )
  }

  _onInput(e) {
    clearTimeout(this._timer)

    const value = e.target.value.trim()

    this._clearBtn.style.display = value
      ? 'flex'
      : 'none'

    if (!value || value.length < this.minLength) {
      this._closeDropdown()
      return
    }

    this._timer = setTimeout(() => {
      this._search(value)
    }, this.debounceMs)
  }

  _onKeydown(e) {
    const items =
      this._dropdown.querySelectorAll('.search-item')

    if (!items.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()

        this._activeIndex = Math.min(
          this._activeIndex + 1,
          items.length - 1
        )

        this._highlight(items)
        break

      case 'ArrowUp':
        e.preventDefault()

        this._activeIndex = Math.max(
          this._activeIndex - 1,
          0
        )

        this._highlight(items)
        break

      case 'Enter':
        e.preventDefault()

        if (
          this._activeIndex >= 0 &&
          items[this._activeIndex]
        ) {
          items[this._activeIndex].click()
        }

        break

      case 'Escape':
        this._closeDropdown()
        break
    }
  }

  _onOutsideClick(e) {
    if (!this._container.contains(e.target)) {
      this._closeDropdown()
    }
  }

  // SEARCH

  async _search(query) {
    if (!query) return

    if (this._cache.has(query)) {
      this._render(this._cache.get(query))
      return
    }

    if (this._abortController) {
      this._abortController.abort()
    }

    this._abortController = new AbortController()

    this._setLoading(true)

    try {
      let url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(query)}` +
        `&format=json` +
        `&addressdetails=1` +
        `&limit=${this.limit}` +
        `&accept-language=${this.lang}`

      if (this.countryCode) {
        url += `&countrycodes=${this.countryCode}`
      }

      const res = await fetch(url, {
        signal: this._abortController.signal,
        headers: {
          'User-Agent': 'MapDirectionApp/1.0',
        },
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()

      this._cache.set(query, data)

      this._render(data)
    } catch (err) {
      if (err.name === 'AbortError') return

      console.warn(
        '[SearchControl] Search error:',
        err
      )

      this._renderError()
    } finally {
      this._setLoading(false)
    }
  }

  // RENDER

  _render(results) {
    this._dropdown.innerHTML = ''
    this._activeIndex = -1

    if (!results.length) {
      this._dropdown.innerHTML = `
        <li class="search-empty">
          <i class="bi bi-geo-alt"></i>
          Không tìm thấy địa điểm
        </li>
      `

      this._openDropdown()
      return
    }

    results.forEach((place, index) => {
      const displayName =
        place.display_name.split(',')[0] ||
        place.name ||
        ''

      const sub = [
        place.address?.city,
        place.address?.town,
        place.address?.district,
        place.address?.state,
        place.address?.country,
      ]
        .filter(Boolean)
        .slice(0, 2)
        .join(', ')

      const li = document.createElement('li')

      li.className = 'search-item'
      li.dataset.index = index

      li.innerHTML = `
        <i class="bi bi-pin-map-fill search-item-icon"></i>

        <div class="search-item-body">
          <div class="search-item-name">
            ${this._escHtml(displayName)}
          </div>

          ${
            sub
              ? `
            <div class="search-item-sub">
              ${this._escHtml(sub)}
            </div>
          `
              : ''
          }
        </div>
      `

      li.addEventListener('click', () => {
        this._select(place)
      })

      this._dropdown.appendChild(li)
    })

    this._openDropdown()
  }

  _renderError() {
    this._dropdown.innerHTML = `
      <li class="search-empty search-error">
        <i class="bi bi-exclamation-triangle"></i>
        Lỗi tìm kiếm
      </li>
    `

    this._openDropdown()
  }

  // SELECT

  _select(place) {
    const lat = parseFloat(place.lat)
    const lon = parseFloat(place.lon)

    if (isNaN(lat) || isNaN(lon)) return

    const displayName =
      place.display_name.split(',')[0] ||
      place.name ||
      ''

    this._input.value = displayName

    this._clearBtn.style.display = 'flex'

    this._closeDropdown()

    if (typeof this.onSelect === 'function') {
      this.onSelect({
        type: this.type,
        displayName,
        fullName: place.display_name,
        lat,
        lon,
        address: place.address || {},
        raw: place,
      })
    }
  }

  // HELPERS

  _highlight(items) {
    items.forEach((item, i) => {
      item.classList.toggle(
        'search-item-active',
        i === this._activeIndex
      )
    })

    if (items[this._activeIndex]) {
      items[this._activeIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }

  _setLoading(isLoading) {
    this._loading.style.display = isLoading
      ? 'flex'
      : 'none'
  }

  _openDropdown() {
    this._dropdown.style.display = 'block'

    this._wrapper.setAttribute(
      'aria-expanded',
      'true'
    )
  }

  _closeDropdown() {
    this._dropdown.style.display = 'none'

    this._wrapper.setAttribute(
      'aria-expanded',
      'false'
    )

    this._activeIndex = -1
  }

  _escHtml(text) {
    const div = document.createElement('div')
    div.textContent = text || ''
    return div.innerHTML
  }

  // PUBLIC API

  clear() {
    this._input.value = ''
    this._dropdown.innerHTML = ''

    this._closeDropdown()

    this._clearBtn.style.display = 'none'

    this._input.focus()
  }

  setValue(text) {
    this._input.value = text || ''

    this._clearBtn.style.display = text
      ? 'flex'
      : 'none'
  }

  focus() {
    this._input?.focus()
  }

  destroy() {
    clearTimeout(this._timer)

    if (this._abortController) {
      this._abortController.abort()
    }

    this._input?.removeEventListener(
      'input',
      this._handleInput
    )

    this._input?.removeEventListener(
      'keydown',
      this._handleKeydown
    )

    document.removeEventListener(
      'click',
      this._handleOutsideClick
    )
  }
}