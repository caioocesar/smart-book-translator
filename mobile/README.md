# Smart Book Translator - React Native Mobile App

This is the React Native mobile version of Smart Book Translator, converted from the React web application.

## Features

- 📱 Native mobile experience
- 📄 Document upload and translation
- 🌐 Multi-language support (English, Portuguese, Spanish)
- 📚 Glossary management
- ⚙️ Settings configuration
- 📊 Translation history
- 💡 AI model recommendations

## Setup

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (for Mac) or Android Emulator

### Installation

```bash
cd mobile
npm install
```

### Running the App

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web (for testing)
npm run web
```

## Configuration

Update the `API_URL` in `App.js` to point to your backend server:

```javascript
const API_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:5000'  // For physical device testing
  : 'https://your-backend-url.com';  // Production
```

For physical device testing, replace `YOUR_LOCAL_IP` with your computer's local IP address (e.g., `192.168.1.100`).

## Project Structure

```
mobile/
├── App.js                 # Main app component with navigation
├── src/
│   ├── screens/          # Screen components
│   │   ├── TranslationScreen.js
│   │   ├── HistoryScreen.js
│   │   ├── GlossaryScreen.js
│   │   └── SettingsScreen.js
│   ├── components/       # Reusable components
│   │   └── DocumentInfoBox.js
│   ├── utils/           # Utilities
│   │   └── i18n.js      # Internationalization
│   └── styles/          # Global styles (if needed)
└── package.json
```

## Key Differences from Web Version

1. **File Upload**: Uses `expo-document-picker` instead of HTML file input
2. **Styling**: Uses React Native `StyleSheet` instead of CSS
3. **Navigation**: Uses React Navigation bottom tabs instead of custom tabs
4. **Storage**: Uses AsyncStorage instead of localStorage
5. **Sharing**: Uses Expo Sharing API for file downloads
6. **UI Components**: Uses React Native Paper for Material Design components

## Testing

The app connects to the same backend API as the web version. Make sure your backend server is running and accessible from your device/emulator.

## Notes

- This is a test/experimental branch for React Native conversion
- Some features may need additional mobile-specific implementations
- File handling and sharing work differently on mobile platforms

