# SPECIFICATION_SYSTEM.md

# WebGIS Tourism Explorer

## 1. Project Overview

### Project Name

WebGIS Tourism Explorer

### Project Type

Frontend-only WebGIS Application

### Description

WebGIS Tourism Explorer là ứng dụng bản đồ trực tuyến cho phép người dùng:

* Tìm kiếm địa điểm theo tên.
* Khám phá các địa điểm du lịch xung quanh.
* Xem thông tin chi tiết địa điểm du lịch.
* Chọn điểm đi và điểm đến bằng nhiều phương thức khác nhau.
* Tìm tuyến đường ngắn nhất giữa hai vị trí bất kỳ.
* Hiển thị khoảng cách và thời gian di chuyển.
* Tương tác trực tiếp trên bản đồ.

Ứng dụng hoạt động hoàn toàn phía Frontend bằng JavaScript ES6 Modules và OpenLayers.

Không sử dụng Backend Server.

---

# 2. Technology Stack

## Frontend

* JavaScript ES6 Modules
* OpenLayers
* Bootstrap 5
* Bootstrap Icons
* Vite

---

# 3. External APIs

## Nominatim

Purpose:

* Search location by name
* Geocoding
* Reverse Geocoding

Used For:

* Search địa điểm
* Điền địa chỉ khi click bản đồ
* Chuyển tên địa danh thành tọa độ

Methods:

```text
search(query)

reverse(lat, lon)
```

---

## OpenTripMap

Purpose:

* Nearby Tourist Attractions
* Place Details

Used For:

* Tìm địa điểm du lịch lân cận
* Hiển thị thông tin địa điểm

Methods:

```text
radius()

xid()
```

---

## OSRM

Purpose:

* Route Calculation
* Distance Calculation
* Duration Calculation

Used For:

* Tìm đường đi ngắn nhất

Methods:

```text
route/v1/driving
```

---

# 4. System Goals

Người dùng có thể:

1. Xem bản đồ.
2. Tìm kiếm địa điểm.
3. Click chọn vị trí trên bản đồ.
4. Lấy vị trí GPS hiện tại.
5. Tìm địa điểm du lịch lân cận.
6. Xem thông tin địa điểm du lịch.
7. Chọn điểm đi.
8. Chọn điểm đến.
9. Tính tuyến đường ngắn nhất.
10. Xem khoảng cách.
11. Xem thời gian di chuyển.
12. Chuyển lớp bản đồ.
13. Zoom bản đồ.

---

# 5. Project Structure

```text
src/

components/
│
├── MapView.js
├── SearchControl.js
├── PlacesPanel.js
├── RoutingPanel.js
└── MapControls.js

services/
│
├── NominatimService.js
├── OpenTripMapService.js
└── RoutingService.js

utils/
│
├── constants.js
└── helpers.js

styles/
│
└── style.css

main.js
```

---

# 6. Core Data Models

## Location Model

```javascript
{
  name: '',
  lat: 0,
  lon: 0
}
```

---

## Place Model

```javascript
{
  xid: '',
  name: '',
  kinds: '',
  lat: 0,
  lon: 0,
  address: '',
  wikipedia: '',
  image: ''
}
```

---

## Route Model

```javascript
{
  geometry: {},
  distance: 0,
  duration: 0,
  startLocation: {},
  endLocation: {}
}
```

distance:

```text
meters
```

duration:

```text
seconds
```

---

# 7. Component Specifications

## MapView.js

### Purpose

Quản lý OpenLayers Map.

### Responsibilities

* Khởi tạo bản đồ.
* Quản lý layer.
* Quản lý marker.
* Quản lý tuyến đường.
* Xử lý click bản đồ.
* Hiển thị tọa độ chuột.

### Internal State

```javascript
this.map

this.markerLayer

this.placeLayer

this.routeLayer

this.startMarker

this.endMarker
```

### Marker Types

```text
User Marker

Tourist Marker

Start Marker

Destination Marker
```

### Public Methods

```javascript
init()

flyTo(lat, lon)

addMarker(lat, lon)

addPlaceMarkers(places)

clearMarkers()

setStartPoint(lat, lon)

setEndPoint(lat, lon)

drawRoute(route)

clearRoute()

switchLayer(type)
```

### Events

```javascript
onMapClick()

onMarkerClick()
```

---

## SearchControl.js

### Purpose

Tìm kiếm địa điểm.

### Responsibilities

* Render thanh tìm kiếm.
* Tìm kiếm địa danh.
* Điều hướng bản đồ.

### Dependencies

```javascript
MapView

PlacesPanel

NominatimService
```

### Public Methods

```javascript
render()

search(keyword)

clear()
```

### Workflow

```text
User Search

↓

NominatimService

↓

Coordinates

↓

MapView.flyTo()

↓

PlacesPanel.loadNearbyPlaces()
```

---

## PlacesPanel.js

### Purpose

Hiển thị danh sách địa điểm du lịch.

### Responsibilities

* Tải địa điểm du lịch.
* Hiển thị danh sách.
* Hiển thị chi tiết.
* Chọn điểm đi.
* Chọn điểm đến.

### Dependencies

```javascript
OpenTripMapService

MapView

RoutingPanel
```

### Public Methods

```javascript
loadNearbyPlaces(lat, lon)

renderPlaces()

showPlaceDetails(place)

setAsStart(place)

setAsDestination(place)
```

### Place Actions

```text
View Details

Set As Start Point

Set As Destination

Get Directions
```

---

## RoutingPanel.js

### Purpose

Quản lý chức năng tìm đường.

### Responsibilities

* Quản lý điểm đi.
* Quản lý điểm đến.
* Chọn điểm từ bản đồ.
* Chọn điểm từ GPS.
* Chọn điểm từ địa điểm du lịch.
* Hoán đổi điểm đi và điểm đến.
* Gọi RoutingService.
* Hiển thị kết quả.

### State

```javascript
this.startPoint = {
  name: '',
  lat: null,
  lon: null
}

this.endPoint = {
  name: '',
  lat: null,
  lon: null
}
```

### Input Sources

#### Start Point

```text
Manual Search

GPS

Map Click

Tourist Marker

Tourist Place Item
```

#### Destination

```text
Manual Search

Map Click

Tourist Marker

Tourist Place Item
```

### Public Methods

```javascript
setStartPoint(location)

setDestination(location)

swapLocations()

calculateRoute()

clearRoute()

renderResult(distance, duration)
```

### UI Layout

```text
Điểm đi

[________________]

[Chọn từ bản đồ]

[Dùng vị trí hiện tại]

--------------------------------

Điểm đến

[________________]

[Chọn từ bản đồ]

--------------------------------

[Hoán đổi]

[Tìm đường]

--------------------------------

Khoảng cách

Thời gian
```

---

## MapControls.js

### Purpose

Các tiện ích điều khiển bản đồ.

### Responsibilities

* GPS.
* Zoom In.
* Zoom Out.
* Chuyển Layer.

### Public Methods

```javascript
locateUser()

zoomIn()

zoomOut()

switchLayer()
```

---

# 8. Services

## NominatimService.js

### Methods

```javascript
search(query)

reverseGeocode(lat, lon)
```

### Returns

```javascript
{
  lat,
  lon,
  display_name
}
```

---

## OpenTripMapService.js

### Methods

```javascript
getNearbyPlaces(lat, lon)

getPlaceDetails(xid)
```

---

## RoutingService.js

### Purpose

Tính toán tuyến đường.

### API

OSRM

### Method

```javascript
getRoute(
  startLat,
  startLon,
  endLat,
  endLon
)
```

### Returns

```javascript
{
  geometry,
  distance,
  duration,
  startLocation,
  endLocation
}
```

---

# 9. User Workflows

## Workflow 1 - Search Location

```text
Search Location

↓

Nominatim

↓

Coordinates

↓

Move Map

↓

Load Attractions
```

---

## Workflow 2 - GPS Location

```text
Current Location

↓

Coordinates

↓

Move Map

↓

Load Attractions
```

---

## Workflow 3 - Explore Attractions

```text
Location Selected

↓

OpenTripMap

↓

Nearby Attractions

↓

Render Markers

↓

Show Place Details
```

---

## Workflow 4 - Select Route Points

### Method A

```text
Manual Search

↓

Start/Destination
```

### Method B

```text
Click Tourist Marker

↓

Set As Start
```

or

```text
Click Tourist Marker

↓

Set As Destination
```

### Method C

```text
Map Pick Mode

↓

Click Map

↓

Reverse Geocode

↓

Fill Input
```

### Method D

```text
GPS

↓

Set As Start
```

---

## Workflow 5 - Calculate Route

```text
Start Point

↓

Destination

↓

RoutingService

↓

OSRM

↓

Route Geometry

↓

MapView.drawRoute()

↓

Distance

↓

Duration
```

---

# 10. Component Communication

```text
SearchControl
      ↓
NominatimService
      ↓
MapView.flyTo()
      ↓
PlacesPanel.loadNearbyPlaces()

PlacesPanel
      ↓
OpenTripMapService
      ↓
Tourist Places
      ↓
MapView.addPlaceMarkers()

Tourist Marker Click
      ↓
PlacesPanel.showPlaceDetails()

Set As Start
      ↓
RoutingPanel.setStartPoint()

Set As Destination
      ↓
RoutingPanel.setDestination()

RoutingPanel
      ↓
RoutingService.getRoute()

RoutingService
      ↓
OSRM

OSRM
      ↓
Route Data

Route Data
      ↓
MapView.drawRoute()
```

---

# 11. Non Functional Requirements

* Frontend Only Architecture
* No Backend
* No Database
* No Authentication
* Responsive Layout
* Mobile Friendly
* ES6 Modules
* Reusable Components
* API Error Handling
* Loading States
* Easy Maintenance

---

# 12. Coding Rules For AI Agents

1. Use JavaScript ES6 Modules.
2. Use Class-based Components.
3. Do not use React.
4. Do not use Vue.
5. Do not use Angular.
6. Do not use TypeScript.
7. Do not use jQuery.
8. Services are responsible for all API requests.
9. Components must never call external APIs directly.
10. OpenLayers logic must stay inside MapView.
11. Routing logic must stay inside RoutingService.
12. Use async/await.
13. Handle all API errors using try/catch.
14. Keep UI rendering separated from service logic.
15. Avoid global variables.
16. Use reusable methods and components.

---

# 13. Future Enhancements

* Hotel Search
* Restaurant Search
* Weather Integration
* Travel Planner
* Favorite Places
* Reviews & Ratings
* Export Route
* Multi Destination Routing
* User Accounts

```
```
