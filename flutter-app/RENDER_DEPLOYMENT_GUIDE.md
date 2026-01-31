# Flutter App - Render Deployment Guide

## Overview
This guide explains how to configure and deploy the Flutter app to work with the Render backend server.

## Prerequisites
- Flutter SDK installed (3.0.0 or higher)
- Render account with deployed backend service
- Git repository setup

## Step 1: Update Backend URL

The Flutter app is configured to connect to the Render backend. The base URL is set in:
- **File:** `lib/config/constants.dart`
- **Current URL:** `https://rajuit-fashion-store.onrender.com`

### Change the Base URL:

If your Render service has a different URL, update the `baseUrl` constant:

```dart
// lib/config/constants.dart
static const String baseUrl = 'https://your-render-service-name.onrender.com';
```

## Step 2: Build for Different Platforms

### Android Build
```bash
flutter build apk
# Output: build/app/outputs/flutter-app-release.apk
```

### iOS Build
```bash
flutter build ios
# Requires macOS with Xcode installed
```

### Web Build
```bash
flutter build web
# Output: build/web/
```

## Step 3: Environment Setup

Make sure these backend environment variables are set on Render:

```
JWT_SECRET=SuperSecretKey123!@#
SESSION_SECRET=SessionSecretKey456$%^
NEON_DB=postgresql://...
GMAIL_USER=rajuit1396@gmail.com
GMAIL_APP_PASSWORD=otldvhcmpxmlqgyn
NODE_ENV=production
```

**Check on Render Dashboard:**
Dashboard → Your Web Service → Environment → Environment Variables

## Step 4: API Endpoints

The Flutter app expects these endpoints on the backend:

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `POST /verify-email` - Email verification
- `POST /forgot-password` - Password reset
- `POST /reset-password` - Confirm password reset

### Products
- `GET /products` - Get all products
- `GET /products/:id` - Get single product
- `GET /products/search` - Search products

### Orders
- `GET /orders` - Get user orders
- `POST /orders` - Create new order
- `GET /orders/:id` - Get order details
- `GET /regenerate-invoice/:id` - Regenerate invoice

### User
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile

## Step 5: API Service Configuration

The API service automatically handles:
- JWT token authentication
- CORS headers
- Request/response logging in debug mode
- Error handling and retry logic
- Token refresh on 401 errors

**File:** `lib/services/api_service.dart`

### Interceptors
- Automatically adds Bearer token to requests
- Logs requests and responses in debug mode
- Handles connection timeouts

## Step 6: Storage Configuration

The app uses secure local storage for:
- JWT tokens
- User session data
- Cart information
- Order history (cached)

**File:** `lib/services/storage_service.dart`

### Key Storage Services:
```dart
// Save token
await StorageService.saveToken(token);

// Get token
String? token = await StorageService.getToken();

// Clear storage on logout
await StorageService.clear();
```

## Step 7: Testing the Connection

### Test Steps:
1. Update `baseUrl` in constants.dart to your Render URL
2. Run the Flutter app:
   ```bash
   flutter run -d chrome  # For web testing
   # or
   flutter run  # For android/ios emulator
   ```
3. Try to login with test credentials
4. Place a test order
5. Check the Render logs for any errors:
   - Dashboard → Your Service → Logs

## Common Issues & Solutions

### Issue: "Connection Refused" or "Network Error"

**Solution:**
- Verify the Render service is running
- Check the correct URL is in constants.dart
- Ensure backend has CORS enabled:
  ```javascript
  app.use(cors({ origin: true, credentials: true }));
  ```

### Issue: "401 Unauthorized"

**Solution:**
- Token may have expired
- The API service will automatically handle token refresh
- Check that JWT_SECRET matches on backend

### Issue: "Network Timeout"

**Solution:**
- Increase timeout in `lib/services/api_service.dart`:
  ```dart
  connectTimeout: const Duration(seconds: 60),
  receiveTimeout: const Duration(seconds: 60),
  ```

### Issue: "CORS Error"

**Solution:**
- Ensure backend has CORS middleware:
  ```javascript
  app.use(cors({ origin: true, credentials: true }));
  ```
- For specific domain, update to:
  ```javascript
  app.use(cors({ 
    origin: 'https://your-flutter-web-url',
    credentials: true 
  }));
  ```

## Step 8: Email Configuration

If emails are not sending:

1. Check Render logs for SMTP errors
2. Verify Gmail credentials are correct
3. Alternative: Use SendGrid or Mailgun (see RENDER_SETUP.md)

## Deployment Steps

### For Production Release:

#### Android
```bash
# Build signed APK
flutter build apk --release

# Or App Bundle
flutter build appbundle --release
```

#### iOS
```bash
# Build for App Store
flutter build ios --release
```

#### Web (if hosting on Render)
```bash
flutter build web --release
# Deploy build/web/ directory
```

## Monitoring

### Check Backend Logs:
```
Render Dashboard → Your Service → Logs
```

### Common Log Patterns:
- Connection attempts from Flutter app
- Authentication requests
- Error messages (if any)

## Troubleshooting Checklist

- [ ] Backend service is running on Render
- [ ] Environment variables are set correctly
- [ ] `baseUrl` in constants.dart matches Render URL
- [ ] CORS is enabled on backend
- [ ] JWT_SECRET is same on backend and frontend (if applicable)
- [ ] Database connection is working (check Render logs)
- [ ] Email configuration is set (if using email features)
- [ ] All required API endpoints are implemented

## Contact & Support

- Email: rajuit1396@gmail.com
- WhatsApp: +8801726466000
- Render Dashboard: https://dashboard.render.com

---

**Last Updated:** January 31, 2026
