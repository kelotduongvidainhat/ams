# AMS Frontend Web App

Giao diện người dùng hiện đại quản lý tài sản trên Blockchain.

## Công nghệ
*   **Framework**: React (Vite) + TypeScript
*   **Styling**: Tailwind CSS (Glassmorphism Design)
*   **Icons**: Lucide-React
*   **Integration**: Axios (connects to Backend API)

## Cấu trúc
```
frontend/
├── src/
│   ├── components/  # Navbar, AssetCard
│   ├── pages/       # Dashboard, CreateAsset
│   ├── services/    # API Logic
│   └── types.ts     # Data Models
└── vite.config.ts   # Proxy Config (/api -> localhost:3000)
```

## Hướng dẫn Chạy

1.  Đảm bảo **Backend** đang chạy (`cd backend && go run main.go`).
2.  Chạy Frontend:
    ```bash
    cd frontend
    npm run dev
    ```
3.  Truy cập: `http://localhost:5173`

## Tính năng
*   **Asset Portfolio**: Xem danh sách tài sản trực quan dạng thẻ.
*   **Integrity Check**: Hiển thị Hash metadata on-chain để chứng minh tính toàn vẹn.
