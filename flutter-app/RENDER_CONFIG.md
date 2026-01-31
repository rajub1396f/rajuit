# Flutter App - Quick Configuration

## Render Server Configuration

### Current Setup
- **Backend Service:** Render (rajuit-fashion-store.onrender.com)
- **Database:** Neon PostgreSQL
- **API Base URL:** Updated to Render in `lib/config/constants.dart`

## Running the App

### Web Development
```bash
cd flutter-app
flutter run -d chrome --web-port=3001
```

### Android/iOS Emulator
```bash
flutter run
```

### Building for Production
```bash
# Android
flutter build apk --release

# iOS
flutter build ios --release

# Web
flutter build web --release
```

## Configuration Files

| File | Purpose |
|------|---------|
| `lib/config/constants.dart` | API URLs, app metadata, categories |
| `lib/services/api_service.dart` | HTTP client, API calls, authentication |
| `lib/services/storage_service.dart` | Local storage for tokens and data |
| `pubspec.yaml` | Dependencies and package configuration |

## Key Dependencies

- **State Management:** Provider
- **HTTP Client:** Dio
- **Storage:** Flutter Secure Storage, GetStorage
- **Routing:** GoRouter
- **UI:** Material 3, CachedNetworkImage
- **PDF/Printing:** PDF, Printing packages

## API Endpoints

All endpoints are prefixed with: `https://rajuit-fashion-store.onrender.com`

### Must-Have Endpoints:
- POST `/register` - Registration
- POST `/login` - Login
- GET `/products` - Get products
- POST `/orders` - Create order
- GET `/orders` - Get user orders

See `RENDER_DEPLOYMENT_GUIDE.md` for full endpoint documentation.

## Environment Variables (Backend)

These must be set on Render dashboard:

```
JWT_SECRET=your_secret_key
SESSION_SECRET=your_session_secret
NEON_DB=your_postgresql_connection_string
GMAIL_USER=rajuit1396@gmail.com
GMAIL_APP_PASSWORD=otldvhcmpxmlqgyn
NODE_ENV=production
```

## Testing Checklist

- [ ] Backend service is live on Render
- [ ] Can access `https://rajuit-fashion-store.onrender.com` in browser
- [ ] Login endpoint responds with valid JWT token
- [ ] Products endpoint returns product list
- [ ] App builds without errors
- [ ] App connects to Render backend successfully

## Troubleshooting

### App can't connect to backend:
1. Check if Render service is running
2. Verify URL in `lib/config/constants.dart`
3. Check browser console for CORS errors
4. Verify backend has CORS enabled

### Login fails:
1. Check if database is initialized
2. Verify JWT_SECRET is set on Render
3. Check backend logs for authentication errors

### Build errors:
```bash
flutter clean
flutter pub get
flutter pub upgrade
```

## Next Steps

1. Verify backend is running on Render
2. Update `baseUrl` if using different Render service name
3. Build and test the app
4. Monitor Render logs during testing
5. Deploy to production when ready

---

**Last Updated:** January 31, 2026
