import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import XYZ from 'ol/source/XYZ'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import LineString from 'ol/geom/LineString'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Style, Circle, Fill, Stroke, Text } from 'ol/style'
import Overlay from 'ol/Overlay'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import { CONFIG, MAP_LAYERS } from '../utils/constants.js'
import { formatKinds, formatDistance } from '../utils/helpers.js'

export default class MapView {
  constructor(containerId) {
    this.containerId = containerId
    this.map = null
    this.markerLayer = null
    this.placeLayer = null
    this.routeLayer = null
    this.markerSource = null
    this.placesSource = null
    this.startSource = null
    this.endSource = null
    this.routeSource = null
    this.startMarker = null
    this.endMarker = null
    this.currentMarker = null
    this.popupOverlay = null
    this.pickMode = null
    this.onMapClick = null
    this.onMarkerClick = null
    this.onMapPick = null
    this.layers = {}
    this.activeLayer = MAP_LAYERS.OSM
  }

  async init() {
    this.markerSource = new VectorSource()
    this.placesSource = new VectorSource()
    this.startSource = new VectorSource()
    this.endSource = new VectorSource()
    this.routeSource = new VectorSource()

    this.markerLayer = new VectorLayer({
      source: this.markerSource,
      style: () => this.getMarkerStyle('user')
    })

    this.placeLayer = new VectorLayer({
      source: this.placesSource,
      style: (feature) => this.getMarkerStyle('tourist', feature)
    })

    const startLayer = new VectorLayer({
      source: this.startSource,
      style: () => this.getMarkerStyle('start')
    })

    const endLayer = new VectorLayer({
      source: this.endSource,
      style: () => this.getMarkerStyle('end')
    })

    this.routeLayer = new VectorLayer({
      source: this.routeSource,
      style: new Style({
        stroke: new Stroke({ color: '#2563eb', width: 5 })
      })
    })

    this.layers[MAP_LAYERS.OSM] = new TileLayer({ source: new OSM() })
    this.layers[MAP_LAYERS.SATELLITE] = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Tiles © Esri'
      }),
      visible: false
    })
    this.layers[MAP_LAYERS.TERRAIN] = new TileLayer({
      source: new XYZ({
        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attributions: '© OpenTopoMap'
      }),
      visible: false
    })

    this.map = new Map({
      target: this.containerId,
      controls: defaultControls({
        zoom: false,
        rotate: false
      }),
      layers: [
        this.layers[MAP_LAYERS.OSM],
        this.layers[MAP_LAYERS.SATELLITE],
        this.layers[MAP_LAYERS.TERRAIN],
        this.routeLayer,
        this.placeLayer,
        startLayer,
        endLayer,
        this.markerLayer
      ],
      view: new View({
        center: fromLonLat(CONFIG.DEFAULT_CENTER),
        zoom: CONFIG.DEFAULT_ZOOM,
        maxZoom: 19
      })
    })

    this.initPopup()
    this.bindMapEvents()
  }

  initPopup() {
    const popupEl = document.createElement('div')
    popupEl.className = 'map-popup'
    popupEl.id = 'map-popup'

    this.popupOverlay = new Overlay({
      element: popupEl,
      autoPan: { animation: { duration: 250 } },
      positioning: 'bottom-center',
      offset: [0, -12],
      stopEvent: true
    })

    this.map.addOverlay(this.popupOverlay)
  }

  bindMapEvents() {
    this.map.on('click', (evt) => {
      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f)

      if (feature?.get('placeData')) {
        this.onMarkerClick?.(feature.get('placeData'))
        return
      }

      const [lon, lat] = toLonLat(evt.coordinate)

      if (this.pickMode) {
        this.onMapPick?.(this.pickMode, lat, lon)
        this.setPickMode(null)
        return
      }

      this.addMarker(lat, lon)
      this.onMapClick?.(lat, lon)
    })

    this.map.on('pointermove', (evt) => {
      const hit = this.map.hasFeatureAtPixel(evt.pixel)
      const cursor = this.pickMode ? 'crosshair' : hit ? 'pointer' : ''
      this.map.getTargetElement().style.cursor = cursor

      const [lon, lat] = toLonLat(evt.coordinate)
      this.updateMouseCoords(lat, lon)
    })
  }

  getMarkerStyle(type, feature) {
    const styles = {
      user: { color: '#ef4444', radius: 10 },
      tourist: { color: '#3b82f6', radius: 7 },
      start: { color: '#22c55e', radius: 10 },
      end: { color: '#f97316', radius: 10 }
    }
    const s = styles[type] || styles.user

    const style = new Style({
      image: new Circle({
        radius: s.radius,
        fill: new Fill({ color: s.color }),
        stroke: new Stroke({ color: '#fff', width: type === 'user' || type === 'start' || type === 'end' ? 3 : 2 })
      })
    })

    if (type === 'tourist' && feature) {
      style.setText(
        new Text({
          text: feature.get('label') || '',
          offsetY: -18,
          font: '11px sans-serif',
          fill: new Fill({ color: '#1e293b' }),
          stroke: new Stroke({ color: '#fff', width: 3 })
        })
      )
    }

    return style
  }

  flyTo(lat, lon, zoom = 15) {
    this.map.getView().animate({
      center: fromLonLat([lon, lat]),
      zoom,
      duration: 800
    })
  }

  addMarker(lat, lon) {
    this.markerSource.clear()
    this.currentMarker = new Feature({
      geometry: new Point(fromLonLat([lon, lat]))
    })
    this.markerSource.addFeature(this.currentMarker)
  }

  addPlaceMarkers(places) {
    this.placesSource.clear()
    places.forEach((place) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([place.lon, place.lat])),
        placeData: place,
        label: place.name?.substring(0, 20) || ''
      })
      this.placesSource.addFeature(feature)
    })
  }

  setStartPoint(lat, lon) {
    this.startSource.clear()
    this.startMarker = new Feature({
      geometry: new Point(fromLonLat([lon, lat]))
    })
    this.startSource.addFeature(this.startMarker)
  }

  setEndPoint(lat, lon) {
    this.endSource.clear()
    this.endMarker = new Feature({
      geometry: new Point(fromLonLat([lon, lat]))
    })
    this.endSource.addFeature(this.endMarker)
  }

  drawRoute(route) {
    this.clearRoute()
    const coords = route.geometry.coordinates.map((c) => fromLonLat(c))
    const feature = new Feature({ geometry: new LineString(coords) })
    this.routeSource.addFeature(feature)

    const extent = this.routeSource.getExtent()
    if (extent.every(Number.isFinite)) {
      this.map.getView().fit(extent, { padding: [60, 60, 60, 420], duration: 800 })
    }
  }

  clearRoute() {
    this.routeSource.clear()
  }

  clearMarkers() {
    this.markerSource.clear()
    this.placesSource.clear()
    this.currentMarker = null
    this.hidePopup()
  }

  clearAll() {
    this.clearMarkers()
    this.clearRoute()
    this.clearRoutePoints()
    this.setPickMode(null)
  }

  resetView() {
    const [lon, lat] = CONFIG.DEFAULT_CENTER
    this.map.getView().animate({
      center: fromLonLat([lon, lat]),
      zoom: CONFIG.DEFAULT_ZOOM,
      duration: 600
    })
  }

  clearRoutePoints() {
    this.startSource.clear()
    this.endSource.clear()
    this.startMarker = null
    this.endMarker = null
  }

  switchLayer(layerName) {
    Object.entries(this.layers).forEach(([name, layer]) => {
      layer.setVisible(name === layerName)
    })
    this.activeLayer = layerName
  }

  setPickMode(mode) {
    this.pickMode = mode
    this.map.getTargetElement().style.cursor = mode ? 'crosshair' : ''
  }

  showPopup(place, coordinates) {
    const popupEl = document.getElementById('map-popup')
    if (!popupEl) return

    const kinds = formatKinds(place.kinds)
    const dist =
      place.dist != null
        ? `<p class="mb-1"><i class="bi bi-signpost-2"></i> ${formatDistance(place.dist)}</p>`
        : ''

    popupEl.innerHTML = `
      <button class="popup-close" aria-label="Đóng">&times;</button>
      <h6>${place.name}</h6>
      <p class="text-muted mb-1"><i class="bi bi-tag"></i> ${kinds}</p>
      ${dist}
      <p class="mb-0 small"><i class="bi bi-geo"></i> ${place.lat?.toFixed(4)}, ${place.lon?.toFixed(4)}</p>
    `

    popupEl.querySelector('.popup-close')?.addEventListener('click', () => this.hidePopup())
    this.popupOverlay.setPosition(coordinates)
  }

  hidePopup() {
    this.popupOverlay?.setPosition(undefined)
  }

  showPlaceOnMap(place) {
    this.showPopup(place, fromLonLat([place.lon, place.lat]))
    this.flyTo(place.lat, place.lon, 16)
  }

  updateMouseCoords(lat, lon) {
    const el = document.getElementById('mouse-coords')
    if (el) {
      el.innerHTML = `Lat: ${lat.toFixed(4)} &nbsp;|&nbsp; Lon: ${lon.toFixed(4)}`
    }
  }

  setMapClickCallback(callback) {
    this.onMapClick = callback
  }

  setMarkerClickCallback(callback) {
    this.onMarkerClick = callback
  }

  setMapPickCallback(callback) {
    this.onMapPick = callback
  }

  zoomIn() {
    const view = this.map.getView()
    view.animate({ zoom: view.getZoom() + 1, duration: 250 })
  }

  zoomOut() {
    const view = this.map.getView()
    view.animate({ zoom: view.getZoom() - 1, duration: 250 })
  }
}
