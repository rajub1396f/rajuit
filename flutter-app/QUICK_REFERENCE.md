# Flutter App - Quick Reference

## Getting Started (5 Minutes)

```bash
# 1. Install Flutter
# Download from: https://flutter.dev/docs/get-started/install

# 2. Navigate to project
cd flutter-app

# 3. Get dependencies
flutter pub get

# 4. Run app
flutter run
```

## Key Files Location

| File | Purpose |
|------|---------|
| `lib/main.dart` | App entry point |
| `lib/config/constants.dart` | Configuration & API URL |
| `lib/services/api_service.dart` | API communication |
| `lib/providers/auth_provider.dart` | Login/Auth logic |
| `lib/screens/home/home_screen.dart` | Products screen |
| `lib/screens/cart/cart_screen.dart` | Shopping cart |
| `lib/screens/checkout/checkout_screen.dart` | Order creation |

## Configuration

**Update Backend URL:**
```dart
// File: lib/config/constants.dart
static const String baseUrl = 'https://rajuit.online';
```

## Build & Release

```bash
# Development
flutter run

# Debug APK
flutter build apk

# Release APK
flutter build apk --release

# Release App Bundle (Play Store)
flutter build appbundle --release

# iOS
flutter build ios --release
```

## Testing Checklist

- [ ] User can register
- [ ] User can login
- [ ] Products display correctly
- [ ] Can search products
- [ ] Can add to cart
- [ ] Cart total calculates correctly
- [ ] Can create order
- [ ] Order appears in Orders screen
- [ ] Order appears in admin dashboard
- [ ] Can logout

## Screen Navigation

```
Home Screen
  ├─ Search/Filter Products
  ├─ Tap Product → Product Detail
  └─ Add to Cart

Cart Icon (Bottom Nav)
  └─ View Cart → Checkout → Create Order

Orders Icon (Bottom Nav)
  └─ View Order History

Profile Icon (Bottom Nav)
  └─ View Profile/Logout
```

## Key Provider Usage

```dart
// Authentication
context.read<AuthProvider>().login(email, password);
context.read<AuthProvider>().logout();

// Products
context.read<ProductProvider>().fetchProducts();

// Cart
context.read<CartProvider>().addItem(item);
context.read<CartProvider>().clearCart();

// Orders
context.read<OrderProvider>().fetchOrders();
context.read<OrderProvider>().createOrder(request);
```

## API Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Server Error |

## Common Commands

```bash
# Clean build
flutter clean
flutter pub get

# Run with verbose logging
flutter run -v

# Check device
flutter devices

# Run on specific device
flutter run -d <device_id>

# Check for issues
flutter doctor

# Format code
dart format lib/

# Analyze code
flutter analyze
```

## Environment Variables

Store sensitive data in `.env` file (create if not exists):
```
BACKEND_URL=https://rajuit.online
API_KEY=your_api_key_here
```

## Project Dependencies

```yaml
provider: ^6.0.0              # State management
dio: ^5.3.0                   # HTTP client
flutter_secure_storage: ^9.0.0 # Secure storage
get_storage: ^2.1.1           # Local storage
cached_network_image: ^3.3.0  # Image caching
intl: ^0.19.0                 # Date formatting
```

## Debugging

```bash
# View logs
flutter logs

# Stop app
flutter run --stop

# Hot reload (won't restart app)
Press 'r' in terminal

# Hot restart (full restart)
Press 'R' in terminal

# Debug specific widget
Add: debugPrintBeginFrameBanner = false;
```

## File Structure Summary

```
flutter-app/
├── lib/
│   ├── main.dart ← Start here
│   ├── config/constants.dart ← Update BASE_URL
│   ├── models/ ← Data models
│   ├── services/ ← API calls
│   ├── providers/ ← State management
│   └── screens/ ← UI screens
├── android/ ← Android config
├── ios/ ← iOS config
├── pubspec.yaml ← Dependencies
└── README.md ← Documentation
```

## Status Color Codes

| Status | Color |
|--------|-------|
| Pending | Orange |
| Confirmed | Blue |
| Processing | Indigo |
| Shipped | Purple |
| Delivered | Green |
| Cancelled | Red |

## Important Notes

✅ Always run `flutter pub get` after pulling changes
✅ Update `BASE_URL` before testing
✅ Clear cache if you see strange behavior
✅ Test on both Android and iOS
✅ Check logcat for errors during development
✅ Keep token storage secure - never log tokens
✅ Always validate form inputs
✅ Show loading indicators during API calls

## Support Resources

- Flutter Docs: https://flutter.dev
- Provider Package: https://pub.dev/packages/provider
- Dio Documentation: https://github.com/flutterchina/dio
- Dart Language: https://dart.dev

## Quick Troubleshooting

**App crashes on startup**
→ `flutter clean && flutter pub get && flutter run`

**Can't login**
→ Check `BASE_URL` in constants.dart

**Products not loading**
→ Check network, restart app, review server logs

**Cart shows zero items**
→ Check GetStorage is initialized, clear app cache

**Orders not appearing**
→ Refresh orders screen, check user is logged in

---

**Version**: 1.0.0  
**Last Updated**: January 30, 2024  
**Status**: Ready for Development
