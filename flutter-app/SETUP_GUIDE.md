# Flutter App - Setup & Deployment Guide

## Quick Start

### Prerequisites
- **Flutter SDK**: 3.0.0 or higher
  - Download from: https://flutter.dev/docs/get-started/install
- **Dart SDK**: Included with Flutter
- **Android**: Android Studio with SDK API 28+
- **iOS**: Xcode 14.0+ (macOS only)
- **Code Editor**: VS Code or Android Studio

### Installation Steps

1. **Install Flutter**
   ```bash
   # Download and extract Flutter SDK
   # Add to PATH environment variable
   
   # Verify installation
   flutter doctor
   ```

2. **Clone/Setup Project**
   ```bash
   cd flutter-app
   flutter pub get
   ```

3. **Configure Backend URL**
   - Edit `lib/config/constants.dart`
   - Update `BASE_URL` to your server:
   ```dart
   static const String baseUrl = 'https://rajuit.online';
   ```

4. **Run the App**
   ```bash
   # On Android
   flutter run
   
   # On iOS (macOS only)
   flutter run -d all
   
   # Web (requires web support)
   flutter run -d web
   ```

## Project Structure Explained

```
lib/
├── main.dart                 # App entry point
├── config/
│   └── constants.dart       # App constants & configuration
├── models/                  # Data models
│   ├── user_model.dart
│   ├── product_model.dart
│   └── order_model.dart
├── services/               # API & Storage services
│   ├── api_service.dart
│   └── storage_service.dart
├── providers/              # State management
│   ├── auth_provider.dart
│   ├── product_provider.dart
│   ├── cart_provider.dart
│   └── order_provider.dart
├── screens/               # UI Screens
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── register_screen.dart
│   ├── home/
│   │   └── home_screen.dart
│   ├── product/
│   │   └── product_detail_screen.dart
│   ├── cart/
│   │   ├── cart_screen.dart
│   │   └── checkout_screen.dart
│   ├── orders/
│   │   └── orders_screen.dart
│   └── profile/
│       └── profile_screen.dart
└── widgets/               # Reusable widgets
    └── (custom components)
```

## Features Overview

### 1. Authentication
- User login & registration
- Email verification
- Password reset (forgot password)
- Secure token storage
- Auto-login on app launch

### 2. Product Browsing
- Browse all products
- Category filtering (Male/Female)
- Search functionality
- Product details view
- Rating & reviews
- Stock availability

### 3. Shopping Cart
- Add/remove items
- Update quantities
- Real-time cart total
- Local storage persistence
- Tax & shipping calculation

### 4. Order Management
- Create orders from cart
- Multiple payment methods
- Shipping address input
- Order history view
- Order status tracking
- Invoice generation

### 5. User Profile
- View profile information
- Account settings
- Logout functionality
- Personal order history

## API Integration

### Base URL
```dart
const String baseUrl = 'https://rajuit.online';
```

### Authentication Endpoints
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /verify-email` - Email verification
- `POST /forgot-password` - Password reset

### Product Endpoints
- `GET /get-products` - Get all products
- `GET /product/{id}` - Product details
- `GET /products/{category}` - Products by category

### Order Endpoints
- `POST /create-order` - Create order
- `GET /get-orders` - User orders
- `GET /get-invoice/{orderId}` - Invoice

## Authentication Flow

1. User enters credentials on login screen
2. App sends credentials to `/login` endpoint
3. Backend validates and returns JWT token
4. Token stored securely in device storage
5. Token sent with all subsequent requests
6. Auto-login if token exists and is valid
7. Logout clears token and user data

## Order Creation Flow

```
User adds products to cart
        ↓
Navigates to cart screen
        ↓
Reviews items & totals
        ↓
Proceeds to checkout
        ↓
Enters shipping address
        ↓
Selects payment method
        ↓
Confirms order
        ↓
App sends to /create-order endpoint
        ↓
Backend creates order in database
        ↓
Generates invoice PDF
        ↓
Returns order confirmation
        ↓
Cart cleared
        ↓
Order appears in Orders screen & Admin Dashboard
```

## State Management (Provider)

### AuthProvider
```dart
// Login
await authProvider.login(email, password);

// Register
await authProvider.register(name, email, password, phone);

// Logout
await authProvider.logout();

// Check status
if (authProvider.isLoggedIn) { ... }
```

### CartProvider
```dart
// Add item
cartProvider.addItem(cartItem);

// Update quantity
cartProvider.updateQuantity(itemId, quantity);

// Get total
double total = cartProvider.grandTotal;

// Get order items
List<OrderItemRequest> items = cartProvider.getOrderItems();
```

### OrderProvider
```dart
// Fetch orders
await orderProvider.fetchOrders();

// Create order
await orderProvider.createOrder(orderRequest);

// Track order status
orderProvider.getOrdersByStatus('pending');
```

## Building for Production

### Android APK
```bash
flutter build apk --release
# Output: build/app/outputs/apk/release/app-release.apk
```

### Android App Bundle (for Play Store)
```bash
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

### iOS
```bash
flutter build ios --release
# Follow iOS deployment guide
```

## Environment Configuration

### Development
- Edit `lib/config/constants.dart`
- Set `BASE_URL` to development server

### Production
- Update `BASE_URL` to production server
- Build with `--release` flag
- Enable ProGuard for code obfuscation

## Troubleshooting

### Build Issues
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter run

# Check doctor
flutter doctor
```

### Connection Issues
- Verify `BASE_URL` is correct
- Check backend server is running
- Ensure HTTPS certificate is valid
- Check network permissions (AndroidManifest.xml)

### Login Issues
- Clear app cache: Settings > Apps > [App] > Storage > Clear Cache
- Check token validity
- Review server logs
- Verify email verification requirement

### Order Not Showing
- Ensure user is logged in
- Check order creation response
- Verify backend database
- Review order provider logs

## Dependencies

Key packages used:

| Package | Purpose |
|---------|---------|
| `provider` | State management |
| `dio` | HTTP client |
| `flutter_secure_storage` | Secure token storage |
| `get_storage` | Local data persistence |
| `image_picker` | Image selection |
| `intl` | Date/time formatting |

## Security Best Practices

✅ JWT token authentication
✅ Secure token storage with encryption
✅ HTTPS only communication
✅ Input validation & sanitization
✅ No sensitive data in logs
✅ Token expiration handling
✅ Secure password requirements

## Testing

### Unit Tests
```bash
flutter test
```

### Widget Tests
```bash
flutter test test/widgets/
```

### Integration Tests
```bash
flutter test integration_test/
```

## Performance Tips

- Uses lazy loading for product lists
- Image caching with Glide equivalent
- Efficient widget rebuilds with Consumer
- Local storage for cart persistence
- Optimized database queries

## Push Notifications (Optional)

To add push notifications:
1. Add `firebase_messaging` package
2. Configure Firebase Console
3. Implement notification handlers
4. Add notification permissions

## App Store & Play Store Submission

### Android (Play Store)
1. Generate signed APK/App Bundle
2. Create developer account
3. Upload to Google Play Console
4. Fill app details & screenshots
5. Submit for review

### iOS (App Store)
1. Create Apple Developer account
2. Create app in App Store Connect
3. Build with Xcode
4. Upload with Transporter
5. Fill app details & screenshots
6. Submit for review

## Support & Updates

- Check Flutter documentation: https://flutter.dev
- Review app logs in Android Studio/Xcode
- Monitor backend server logs
- Track analytics with Firebase (optional)

## Version Management

Current Version: 1.0.0

To update version:
- Edit `pubspec.yaml`: `version: 1.0.0+1`
- First number = app version
- Second number = build number

## Contacts & Maintenance

- Backend Support: Raju IT Support
- API Issues: Check server.js logs
- App Issues: Review Flutter docs & logs
