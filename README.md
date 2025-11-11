# PME ERP Mobile App

A modern mobile application for PME (Project Management Enterprise) that provides attendance tracking, location-based services, and seamless integration with the PME ERP system.

## Features

- **User Authentication**: Secure login with email and password
- **Attendance Tracking**: Record and track employee attendance with geolocation
- **Location Services**: Automatic location detection with reverse geocoding
- **Offline Support**: Work offline with data sync when connection is restored
- **Cross-Platform**: Built with Ionic and React for both Android and iOS

## Prerequisites

- Node.js 16+
- npm 8+
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Ionic CLI (`npm install -g @ionic/cli`)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/pme-mobile.git
   cd pme-mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the project root
   - Add your API endpoints and other configurations

## Development

### Running the App

```bash
# Start the development server
ionic serve

# For Android development
ionic capacitor run android

# For iOS development (macOS only)
ionic capacitor run ios
```

### Building for Production

```bash
# Build the app
ionic build

# Sync with native platforms
ionic cap sync

# Open in Android Studio / Xcode for final build
ionic cap open android
# or
ionic cap open ios
```

## Project Structure

- `/src` - Source code
  - `/components` - Reusable UI components
  - `/pages` - Application screens
  - `/services` - API and business logic
  - `/assets` - Static assets (images, fonts, etc.)
  - `/theme` - Global styles and theming

## API Integration

The app communicates with the PME ERP backend API. Update the API endpoints in `src/services/api.ts`.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
API_BASE_URL=your_api_base_url
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GEOAPIFY_API_KEY=your_geoapify_api_key
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@yourcompany.com or open an issue in the repository.

## Screenshots

![Login Screen](/screenshots/login.png)
![Dashboard](/screenshots/dashboard.png)
![Attendance](/screenshots/attendance.png)

---

**Note**: This is a work in progress. More features and documentation will be added soon.
