# WebGIS Tourism Explorer

Ứng dụng bản đồ du lịch trực tuyến cho phép khám phá địa điểm, tìm đường đi và xem thông tin du lịch theo thời gian thực được xây dựng với OpenLayers 10 và JavaScript ES6 Modules.

---

## Giao diện
-- Giao diện trang chủ 
![Trang chủ](./src/img/interfaces/Trang_chu.png)

-- GoiYDiaDiemDuLich
![Gợi ý địa điểm du lịch](./src/img/interfaces/GoiYDiaDIemDuLichLienKe.png)

-- Thông tin địa điểm chi tiết
![Thông tin địa điểm chi tiết](./src/img/interfaces/ThongTinDiaDiem.png)

-- Tìm đường
![Tìm đường](./src/img/interfaces/TimDuong.png) 

---

## Tính năng chính

-  **Tìm kiếm địa điểm** theo tên, hỗ trợ gợi ý kết quả
-  **Định vị GPS** lấy vị trí hiện tại của người dùng
-  **Khám phá địa điểm du lịch** lân cận trong bán kính 5km
-  **Xem thông tin chi tiết** địa điểm (mô tả, hình ảnh, tọa độ)
-  **Tính tuyến đường ngắn nhất** giữa hai điểm bất kỳ
-  **Hiển thị khoảng cách và thời gian** di chuyển
-  **Chuyển đổi lớp bản đồ**: Đường phố / Vệ tinh / Địa hình
-  **Xem tọa độ chuột** theo thời gian thực

---
 
## Công nghệ sử dụng
 
| Thành phần | Công nghệ |
|---|---|
| Build tool | Vite + JavaScript ES6 Modules |
| Bản đồ | OpenLayers 10 |
| UI | Bootstrap 5 + Bootstrap Icons |
| Font chữ | Nunito, DM Mono (Google Fonts) |
| Geocoding | Nominatim API (OpenStreetMap) |
| Địa điểm du lịch | OpenTripMap API |
| Tính đường | OSRM (Project OSRM) |
| Tile bản đồ | OpenStreetMap / ArcGIS World Imagery / OpenTopoMap |
 
---

## Kiến trúc dự án
 
```
src/
├── components/
│   ├── MapView.js          # Khởi tạo & quản lý bản đồ OpenLayers
│   ├── SearchControl.js    # Ô tìm kiếm với dropdown gợi ý
│   ├── PlacesPanel.js      # Danh sách & chi tiết địa điểm du lịch
│   ├── RoutingPanel.js     # Panel tìm đường & hiển thị kết quả
│   └── MapControls.js      # Nút GPS, zoom, xóa bản đồ, đổi layer
├── services/
│   ├── NominatimService.js      # Tìm kiếm & reverse geocoding
│   ├── OpenTripMapService.js    # Lấy danh sách & chi tiết địa điểm
│   └── RoutingService.js        # Tính tuyến đường (OSRM + waypoints VN)
├── utils/
│   ├── constants.js        # Cấu hình toàn cục & hằng số
│   └── helpers.js          # Hàm tiện ích dùng chung
└── styles/
    └── style.css           # CSS toàn ứng dụng (CSS variables, responsive)
```


### Luồng dữ liệu chính
 
```
Người dùng (click bản đồ / GPS / tìm kiếm)
    │
    ▼
main.js (TourismMapApp)
    ├── MapView           → Hiển thị marker, route, popup
    ├── PlacesPanel       → Gọi OpenTripMapService → Render danh sách
    ├── RoutingPanel      → Gọi RoutingService → Vẽ tuyến đường
    └── MapControls       → Điều phối GPS, layer, clear
```
 
---
 

## Biểu đồ thiết kế

### Use Case Diagram
![Usecase Diagram](./src/img/BieuDoUsecase_TimKiemDiaDiemDuLich.png)

### Component Diagram
![Component Diagram](./src/img/ComponentDiagram_TimKiemDiaDiemDuLich.png)

### Sequence Diagram — Tìm kiếm địa điểm
![Sequence Diagram](./src/img/BieuDoSequence_TimKiemDiaDiem.png)

### Sequence Diagram — Tính tuyến đường
![Sequence Diagram](./src/img/BieuDoSequence_TinhTuyenDuong.png)

### Activity Diagram — Định vị GPS
![Activity Diagram](./src/img/ActivityDiagram_DinhviGPS_TaiDiaDiemDuLich.png)

---

## Cài đặt & Chạy

### Yêu cầu hệ thống
 
- Node.js >= 20.19.0
- Trình duyệt hiện đại hỗ trợ ES6 Modules và Geolocation API


### Các bước cài đặt
 
```bash
# 1. Clone repository
git clone <repo-url>
cd timkiemdiadiemdulich
 
# 2. Cài đặt dependencies
npm install
 
# 3. Chạy môi trường phát triển
npm run dev
```
 
> Mở trình duyệt tại `http://localhost:5173`

---

## Cấu hình API Key

Chỉnh sửa file `src/utils/constants.js`:

```js
export const CONFIG = {
  OPENTRIPMAP_API_KEY: 'your_api_key_here',
  DEFAULT_CENTER: [105.8412, 21.0285], // Tọa độ mặc định: Hà Nội
  DEFAULT_ZOOM: 14,
  SEARCH_RADIUS: 5000    // Bán kính tìm kiếm (mét)
}
```

> Đăng ký API key miễn phí tại: https://opentripmap.io

## Ghi chú kỹ thuật
 
- **Tìm đường nội địa:** `RoutingService` tự động chèn các waypoint trung gian (Hà Nội, Đà Nẵng, TP.HCM, v.v.) khi tuyến đường dài hơn 220 km, đảm bảo route không đi qua lãnh thổ nước khác.
- **Cache tìm kiếm:** `SearchControl` lưu kết quả tra cứu Nominatim trong bộ nhớ phiên làm việc để giảm số lần gọi API.
- **Responsive:** Giao diện hỗ trợ cả desktop lẫn mobile (breakpoint 768px), sidebar và panel địa điểm tự co lại.
---

## Giấy phép

MIT License