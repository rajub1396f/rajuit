# Flutter + Render Setup Verification

## ✅ Setup Complete!

Your Flutter app has been configured to work with the Render backend server.

## What Was Updated

### 1. API Configuration
- ✅ Updated `baseUrl` in `lib/config/constants.dart` to Render server
- ✅ Added fallback URLs for development and testing
- ✅ Verified API service handles authentication and error handling

### 2. Documentation Created
- ✅ `RENDER_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- ✅ `RENDER_CONFIG.md` - Quick configuration reference
- ✅ This verification checklist

### 3. Architecture Review
- ✅ HTTP Client (Dio) - Properly configured for Render
- ✅ Token Management - Auto JWT handling
- ✅ Error Handling - Network errors handled gracefully
- ✅ CORS Support - Backend configured for cross-origin requests

## Pre-Deployment Checklist

### Backend Setup (Render)
- [ ] Backend service is deployed on Render
- [ ] Environment variables are set:
  - JWT_SECRET
  - SESSION_SECRET
  - NEON_DB
  - GMAIL_USER
  - GMAIL_APP_PASSWORD
- [ ] Database is initialized with tables
- [ ] CORS is enabled in backend
- [ ] Service is responding to requests

### Flutter App Setup
- [ ] `pubspec.yaml` dependencies are up to date
  ```bash
  flutter pub get
  ```
- [ ] `lib/config/constants.dart` has correct Render URL
- [ ] No compilation errors:
  ```bash
  flutter analyze
  ```

### Testing Steps

1. **Start the app:**
   ```bash
   flutter run -d chrome  # or your target device
   ```

2. **Test login:**
   - Use valid credentials from database
   - Verify token is received and stored

3. **Test product listing:**
   - Navigate to products screen
   - Verify data loads from Render backend

4. **Test order placement:**
   - Add items to cart
   - Complete checkout
   - Verify order appears in Render database

5. **Check Render logs:**
   - Go to Render Dashboard
   - View logs for any errors

## API Endpoints Verification

Test these endpoints to ensure backend is ready:

```bash
# Test basic connectivity
curl https://rajuit-fashion-store.onrender.com

# Test login endpoint
curl -X POST https://rajuit-fashion-store.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test products endpoint
curl https://rajuit-fashion-store.onrender.com/products

# Test orders endpoint (requires auth token)
curl https://rajuit-fashion-store.onrender.com/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## File Structure

```
flutter-app/
├── lib/
│   ├── config/
│   │   └── constants.dart         ← Render URL configured here
│   ├── services/
│   │   ├── api_service.dart       ← HTTP client
│   │   └── storage_service.dart   ← Token storage
│   ├── providers/
│   │   ├── auth_provider.dart
│   │   ├── product_provider.dart
│   │   ├── cart_provider.dart
│   │   └── order_provider.dart
│   ├── screens/
│   ├── models/
│   └── main.dart
├── RENDER_DEPLOYMENT_GUIDE.md     ← Full deployment guide
├── RENDER_CONFIG.md               ← Quick reference
└── pubspec.yaml
```

## Environment-Specific Configuration

### Development
- Base URL: `http://localhost:3000`
- Enable logging: Debug logs in API service

### Production
- Base URL: `https://rajuit-fashion-store.onrender.com`
- Disable logging: Set `kDebugMode = false`

To switch environments, edit `lib/config/constants.dart`:

```dart
static const String baseUrl = Constants.developmentUrl;  // for dev
static const String baseUrl = Constants.productionUrl;   // for production
```

## Common Commands

```bash
# Update dependencies
flutter pub upgrade

# Run app in development
flutter run -d chrome

# Build for production
flutter build apk --release        # Android
flutter build ios --release        # iOS
flutter build web --release        # Web

# Run tests
flutter test

# Check for issues
flutter analyze

# Clean build
flutter clean
flutter pub get
```

## Troubleshooting

### Issue: "Unable to connect to Render backend"
**Solution:**
1. Verify Render service URL is correct in `constants.dart`
2. Check if Render service is running (check Dashboard)
3. Verify network connectivity
4. Check browser console for CORS errors

### Issue: "401 Unauthorized"
**Solution:**
1. Token may be expired - refresh by logging in again
2. Verify JWT_SECRET on backend matches app expectations
3. Check token is being stored correctly

### Issue: "Database connection error"
**Solution:**
1. Check NEON_DB environment variable on Render
2. Verify database tables are created
3. Check Render logs for database errors

### Issue: "Email not sending"
**Solution:**
1. Verify GMAIL_USER and GMAIL_APP_PASSWORD on Render
2. Check Gmail 2-step verification is enabled
3. Consider using SendGrid or Mailgun instead

## Performance Optimization

1. **API Response Caching:**
   ```dart
   // Products are cached locally
   // Invalidate cache after 5 minutes
   ```

2. **Image Caching:**
   - Using CachedNetworkImage for products
   - Reduces bandwidth usage

3. **State Management:**
   - Using Provider for efficient updates
   - Minimizes unnecessary rebuilds

## Security Considerations

- ✅ JWT tokens stored in secure storage
- ✅ CORS properly configured
- ✅ HTTPS enforced for production
- ✅ Environment variables used for secrets
- ✅ No hardcoded credentials in app code

## Next Steps

1. **Verify Backend is Live:**
   ```bash
   flutter run -d chrome
   ```

2. **Test All Features:**
   - User registration
   - Email verification
   - Login/logout
   - Product browsing
   - Cart management
   - Order placement

3. **Deploy to Production:**
   ```bash
   flutter build apk --release
   # or
   flutter build web --release
   ```

4. **Monitor Render Logs:**
   - Check for errors
   - Monitor performance
   - Track user activity

## Support Resources

- **Flutter Docs:** https://flutter.dev/docs
- **Dio Docs:** https://pub.dev/packages/dio
- **Render Docs:** https://render.com/docs
- **Provider Docs:** https://pub.dev/packages/provider

## Contact

- Email: rajuit1396@gmail.com
- WhatsApp: +8801726466000
- Render Support: https://support.render.com

---

**Setup Date:** January 31, 2026
**Status:** ✅ Ready for Testing
**Next Action:** Verify backend service is running and test connections
