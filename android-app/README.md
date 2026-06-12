# Raju IT Fashion Store - Android App

A native Android app for the Raju IT Fashion Store e-commerce platform, allowing users to browse products, create orders, and track their purchases.

## Features

- **User Authentication**: Login/Register with JWT token support
- **Product Browsing**: Browse male/female fashion products
- **Shopping Cart**: Add/remove items, manage quantities
- **Order Creation**: Place orders with shipping details
- **Order Tracking**: View all orders and their status
- **Order Details**: View invoices and order information
- **Responsive UI**: Material Design 3 interface

## Project Structure

```
android-app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/rajuit/fashionstore/
│   │   │   │   ├── activities/
│   │   │   │   ├── fragments/
│   │   │   │   ├── adapters/
│   │   │   │   ├── models/
│   │   │   │   ├── network/
│   │   │   │   ├── utils/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   └── App.kt
│   │   │   ├── res/
│   │   │   └── AndroidManifest.xml
│   │   └── test/
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── build.gradle.kts
├── settings.gradle.kts
└── README.md
```

## Setup Instructions

### Prerequisites

- Android Studio Hedgehog or later
- SDK Version: API 28 (Android 9.0) minimum
- Target SDK: API 34 (Android 14)
- JDK 17 or later

### Installation

1. **Clone the app files**:
   ```bash
   git clone <repo-url> android-app
   cd android-app
   ```

2. **Open in Android Studio**:
   - File → Open → Select the `android-app` folder

3. **Configure Backend URL**:
   - Edit `app/src/main/java/com/rajuit/fashionstore/utils/ApiClient.kt`
   - Update `BASE_URL` to your backend server URL:
   ```kotlin
   companion object {
       private const val BASE_URL = "https://your-domain.com"
   }
   ```

4. **Build and Run**:
   ```bash
   ./gradlew build
   ./gradlew installDebug
   ```

## API Integration

The app communicates with your Node.js backend using these endpoints:

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `POST /verify-email` - Email verification
- `POST /forgot-password` - Password reset

### Orders
- `POST /create-order` - Create a new order
- `GET /get-orders` - Get user's orders
- `GET /get-invoice/:orderId` - Download order invoice

### Products
- `GET /get-products` - Get all products
- `GET /product/:id` - Get product details

## Authentication Flow

1. User registers/logs in via the app
2. Backend returns JWT token
3. Token is stored securely using EncryptedSharedPreferences
4. All subsequent requests include the token in Authorization header
5. Token is refreshed as needed

## Order Flow

1. User browses products and adds to cart
2. User enters shipping address and payment method
3. App sends order request with items to `/create-order` endpoint
4. Backend creates order, generates invoice, and stores in database
5. Order appears in both app and admin dashboard
6. User can track order status in real-time

## Dependencies

Key libraries used:

- **Networking**: Retrofit 2, OkHttp 3, Gson
- **Async**: Kotlin Coroutines
- **Storage**: DataStore, EncryptedSharedPreferences
- **UI**: Material Design 3, AndroidX
- **Image Loading**: Glide
- **PDF Viewing**: PDF Viewer
- **Local Database**: Room

## File Structure Details

### Key Files

1. **ApiClient.kt** - Retrofit setup and API service
2. **AuthViewModel.kt** - Authentication logic
3. **OrderViewModel.kt** - Order creation and management
4. **AuthActivity.kt** - Login/Register UI
5. **OrdersFragment.kt** - Display user orders
6. **CreateOrderActivity.kt** - Order creation UI
7. **TokenManager.kt** - Secure token storage

## Security Features

- JWT Token authentication
- Secure storage with EncryptedSharedPreferences
- HTTPS communication
- No sensitive data logging
- ProGuard obfuscation enabled

## Testing

Run unit tests:
```bash
./gradlew test
```

Run instrumentation tests on device:
```bash
./gradlew connectedAndroidTest
```

## Build Variants

- **debug** - Development build with debugging enabled
- **release** - Production build with ProGuard obfuscation

## APK Generation

To generate release APK:

```bash
./gradlew assembleRelease
```

APK will be available at: `app/build/outputs/apk/release/app-release.apk`

## Troubleshooting

### Connection Issues
- Ensure backend server is running
- Check `BASE_URL` configuration
- Verify network permissions in AndroidManifest.xml

### Login Issues
- Clear app data from Settings
- Check token storage in device file system
- Review server logs for authentication errors

### Order Not Appearing
- Verify user authentication token is valid
- Check order creation response in logcat
- Ensure backend database is accessible

## Support

For issues or questions:
- Check the server logs
- Review Android logcat output
- Verify backend API endpoints are accessible

## License

ISC License - Same as main project
