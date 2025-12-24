# AMS Frontend

The Asset Management System (AMS) frontend is a modern React application built with TypeScript and Vite. It serves as the primary interface for users to interact with the blockchain-based asset management system.

## 🏗️ Architecture

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (via Utility Classes) + Glassmorphism Design
- **State Management**: React Hooks (`useState`, `useEffect`, `useContext`)
- **Real-time**: WebSocket integration for live updates

## 🚀 Key Features

### 1. Dashboard
- **Portfolio View**: View, transfer, edit, and share owned assets.
- **Explorer View**: Browse public assets across the network.
- **Marketplace View**: Buy and list assets for sale (NFT-style).
- **Admin Tab**: System-wide statistics and user management (Admin only).

### 2. Asset Management
- **Create Asset**: Register new assets (Real Estate, Art, etc.) on the blockchain.
- **Transfer**: Secure multi-signature transfer workflow.
- **Edit Asset**: Update asset details and metadata.
- **Access Control**: Grant/Revoke access to private assets.

### 3. User Profile
- **Registration**: Create a new blockchain identity.
- **Login**: Dual-layer auth (Wallet + Password).
- **Edit Profile**: Update personal information (`FullName`, `IdentityNumber`) directly on the ledger.

## 🛠️ Components

### Modals
- `CreateAssetModal`: Asset registration form.
- `EditProfileModal`: User profile update form.
- `TransferModal`: Asset ownership transfer interface.
- `ListAssetModal`: Marketplace listing interface.

### Services
- `api.ts`: Centralized Axios instance for Backend API calls (REST).
- `WebSocketContext.tsx`: Manages real-time connection for event updates.

## 📦 Running Locally

```bash
docker-compose up -d frontend
# OR
cd frontend
npm install
npm run dev
```

The application runs on `http://localhost:5173`.
