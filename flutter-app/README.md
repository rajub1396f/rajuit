# Raju IT Fashion Store - Flutter App

A cross-platform Flutter mobile app for the Raju IT Fashion Store e-commerce platform with iOS and Android support.

## Features

✨ **User Authentication**
- User registration and login
- Email verification
- Password reset functionality
- JWT token-based authentication

🛍️ **Product Browsing**
- Browse male/female fashion products
- Category filtering
- Product details and images
- Product ratings and reviews

🛒 **Shopping Cart**
- Add/remove items from cart
- Update quantities
- Real-time cart total calculation
- Persistent cart storage

📦 **Order Management**
- Create orders with items
- Track order status
- View order details and history
- Download invoices
- Support for multiple payment methods (COD, Card, Bank Transfer)

📊 **User Dashboard**
- View profile information
- Manage orders
- Track order status in real-time

## Project Structure

```
lib/
├── main.dart
├── config/
│   └── constants.dart
├── models/
│   ├── user_model.dart
│   ├── product_model.dart
│   └── order_model.dart
├── services/
│   ├── api_service.dart
│   └── storage_service.dart
├── providers/
│   ├── auth_provider.dart
│   ├── product_provider.dart
│   ├── cart_provider.dart
│   └── order_provider.dart
├── screens/
│   ├── auth/
│   │   ├── login_screen.dart
│   │   ├── register_screen.dart
│   │   └── verify_email_screen.dart
│   ├── home/
│   │   ├── home_screen.dart
│   │   └── product_list_screen.dart
│   ├── product/
│   │   └── product_detail_screen.dart
│   ├── cart/
│   │   └── cart_screen.dart
│   ├── checkout/
│   │   └── checkout_screen.dart
│   ├── orders/
│   │   ├── orders_screen.dart
│   │   └── order_detail_screen.dart
│   └── profile/
│       └── profile_screen.dart
├── widgets/
│   ├── product_card.dart
│   ├── order_card.dart
│   ├── custom_button.dart
│   └── custom_text_field.dart
└── utils/
    ├── validators.dart
    └── extensions.dart
```

## Setup Instructions

### Prerequisites

- Flutter SDK (3.0 or later)
- Dart SDK (included with Flutter)
- iOS: Xcode 14.0 or later
- Android: Android Studio and SDK

### Installation

1. **Clone the project**:
   ```bash
   git clone <repo-url>
   cd flutter-app
   ```

2. **Get dependencies**:
   ```bash
   flutter pub get
   ```

3. **Configure Backend URL**:
   - Edit `lib/config/constants.dart`
   - Update `BASE_URL` to your backend server:
   ```dart
   const String BASE_URL = 'https://rajuit.online';
   ```

4. **Run the app**:
   ```bash
   # For Android
   flutter run -d android

   # For iOS
   flutter run -d ios

   # For Web
   flutter run -d web
   ```

## API Integration

The app communicates with your Node.js backend:

### Authentication Endpoints
- `POST /register` - User registration
- `POST /login` - User login
- `POST /verify-email` - Email verification
- `POST /forgot-password` - Password reset

### Product Endpoints
- `GET /get-products` - Get all products
- `GET /product/:id` - Get product details
- `GET /products/:category` - Get products by category

### Order Endpoints
- `POST /create-order` - Create new order
- `GET /get-orders` - Get user orders
- `GET /get-invoice/:orderId` - Download invoice

## State Management

Uses **Provider** package for state management:

- **AuthProvider**: Manages user authentication and login state
- **ProductProvider**: Manages product fetching and filtering
- **CartProvider**: Manages shopping cart operations
- **OrderProvider**: Manages order creation and tracking

## Security Features

- ✅ JWT token authentication
- ✅ Secure token storage using flutter_secure_storage
- ✅ HTTPS communication
- ✅ Input validation and sanitization
- ✅ Secure password handling
- ✅ No sensitive data logging in production

## Dependencies

Key packages used:

```yaml
provider: ^6.0.0              # State management
dio: ^5.3.0                   # HTTP client
flutter_secure_storage: ^9.0.0 # Secure token storage
get_storage: ^2.1.1           # Local storage
image_picker: ^1.0.0          # Image selection
share_plus: ^7.2.0            # Share functionality
url_launcher: ^6.2.0          # URL handling
intl: ^0.19.0                 # Internationalization
```

## Building for Production

### Android APK:
```bash
flutter build apk --release
```
Output: `build/app/outputs/apk/release/app-release.apk`

### Android App Bundle:
```bash
flutter build appbundle --release
```

### iOS:
```bash
flutter build ios --release
```

## Authentication Flow

1. User launches app
2. Check if token exists in secure storage
3. If yes, verify token and show home screen
4. If no, show login screen
5. User enters credentials
6. Backend returns JWT token
7. Token stored securely
8. User navigated to home screen

## Order Creation Flow

1. User browses products and adds to cart
2. User reviews cart items
3. User enters shipping address
4. User selects payment method
5. User confirms order
6. App sends order to `/create-order` endpoint
7. Backend creates order and returns confirmation
8. Order visible in user's orders screen
9. Order also appears in admin dashboard

## Testing

Run tests:
```bash
flutter test
```

## Troubleshooting

### Build Issues
- Clear Flutter cache: `flutter clean`
- Get latest dependencies: `flutter pub get`
- Rebuild: `flutter pub get && flutter run`

### Connection Issues
- Verify `BASE_URL` in constants
- Check backend server is running
- Ensure network permissions are granted

### Authentication Issues
- Clear app data and re-login
- Check token validity
- Review server logs

## Performance Tips

- Uses lazy loading for product lists
- Implements image caching
- Optimized rebuild with Consumer widgets
- Efficient local storage usage

## Support

For issues or questions:
- Check Flutter documentation: https://flutter.dev
- Review backend server logs
- Check app logs in Android Studio/Xcode

## License

ISC License - Same as main project
