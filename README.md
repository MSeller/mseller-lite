# MSeller Lite 📱

**MSeller Lite** is a modern mobile inventory management application built with React Native and Expo. Designed for retail professionals, warehouse staff, and field personnel, it provides real-time inventory tracking, barcode scanning, and seamless synchronization with cloud services.

![MSeller Lite](./assets/images/mseller-logo-dark.png)

## 🚀 Features

### 📦 **Inventory Management**

- Real-time inventory tracking and updates
- Barcode scanning for quick product identification
- Product search and filtering capabilities
- Stock level monitoring and alerts
- Inventory reconciliation and auditing

### 🔐 **Authentication & Security**

- Firebase Authentication integration
- Secure user profile management
- Role-based access control
- Automatic token refresh and session management

### 🌐 **Multi-language Support**

- English and Spanish localization
- Dynamic language switching
- Culturally appropriate formatting

### 🖨️ **Label Printing**

- Zebra printer integration
- Bluetooth, WiFi, and USB connectivity
- ZPL (Zebra Programming Language) support
- Multiple printer configuration options

### 📱 **Cross-Platform**

- iOS and Android native builds
- Web support for testing and development
- Responsive design for various screen sizes

## 🛠️ Tech Stack

- **Framework**: React Native with Expo (~53.0.20)
- **Navigation**: Expo Router with file-based routing
- **UI Library**: React Native Paper
- **Authentication**: Firebase Auth
- **HTTP Client**: Axios with automatic token management
- **State Management**: React Context API
- **Styling**: React Native StyleSheet with theming
- **Analytics**: Datadog Mobile RUM
- **Internationalization**: i18next with react-i18next
- **Build System**: EAS (Expo Application Services)

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)
- **MSeller Account**: Create an account at [https://cloud.mseller.app/register/](https://cloud.mseller.app/register/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/victors1681/mseller-inventory-management.git
   cd mseller-lite
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your Firebase and Datadog credentials
   ```

4. **Start the development server**

   ```bash
   pnpm start
   ```

### Development Scripts

```bash
# Start development server
pnpm start

# Start with local API mode
pnpm start:local

# Platform-specific development
pnpm ios          # iOS simulator
pnpm android      # Android emulator
pnpm web          # Web browser

# Local development with API
pnpm ios:local    # iOS with local API
pnpm android:local # Android with local API
pnpm web:local    # Web with local API

# Code quality
pnpm lint         # Run ESLint
pnpm validate-template # Full validation (lint + TypeScript)

# Production build
pnpm build:android:prod # Android production build
```

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication with Email/Password
3. Copy your Firebase config to `.env`:

````env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

## 📚 Documentation

- [API Integration Guide](./docs/API_INTEGRATION.md)
- [Inventory Management Guide](./docs/INVENTORY_MANAGEMENT_README.md)
- [Environment Setup](./docs/ENVIRONMENT_SETUP.md)
- [Local Development](./docs/LOCAL_DEVELOPMENT.md)

## 🧪 Testing

```bash
# Run TypeScript validation
npx tsc --noEmit

# Run ESLint
pnpm lint

# Full validation suite
pnpm validate-template
````

## 🚀 Deployment

### Production Build

```bash
# Android production build
pnpm build:android:prod

# Or using EAS CLI directly
eas build --platform android --profile production
```

### CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/mseller-lite-ci.yml`) that:

- Validates TypeScript compilation
- Runs ESLint checks
- Verifies app configuration
- Validates inventory management components
- Checks MSeller Lite assets

## 📄 License

This project is proprietary software. All rights reserved. Mobile Seller LLC

## 👥 Team

- **Victor Santos** - [@victors1681](https://github.com/victors1681)
