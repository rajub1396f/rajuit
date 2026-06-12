# Google Authentication for Flutter App - Setup Guide

## Overview
Google Authentication has been successfully integrated into the Raju IT Fashion Store Flutter app, allowing users to sign in with their Google accounts on both the Login and Register screens.

## Features Implemented ✅

### 1. **Google Sign-In Service**
- Created `google_signin_service.dart` with complete Google authentication functionality
- Handles sign-in, sign-out, authentication token retrieval, and account disconnection
- Proper error handling and debug logging

### 2. **Auth Provider Integration**  
- Added `signInWithGoogle()` method to `AuthProvider`
- Integrated with existing authentication flow
- Automatic storage of user data and JWT tokens
- Updated logout to include Google sign-out

### 3. **API Service Enhancement**
- Added `googleAuth()` endpoint integration
- Sends Google access token, email, and name to backend
- Follows same authentication response pattern as regular login

### 4. **UI Implementation**
- Added Google Sign-In buttons to both Login and Register screens
- Clean UI design with Google branding-inspired styling
- Loading states and error handling
- "OR" divider for clear separation between authentication methods

### 5. **Dependencies**
- Added `google_sign_in: ^6.2.1` to pubspec.yaml
- All dependencies successfully installed

## Configuration Required

### 1. **Android Configuration** (Required for Android deployment)

Add to `android/app/build.gradle.kts`:
```kotlin
android {
    defaultConfig {
        // Add this line with your package name
        applicationId "com.rajuit.fashion_store" // Update this
    }
}
```

### 2. **Add Google Services Configuration File**

For Android, you'll need to add the `google-services.json` file:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Add Android app with package name: `com.rajuit.fashion_store`
4. Download `google-services.json`
5. Place it in `android/app/` directory

Add to `android/build.gradle.kts`:
```kotlin
buildscript {
    dependencies {
        classpath("com.google.gms:google-services:4.4.2")
    }
}
```

Add to `android/app/build.gradle.kts`:
```kotlin
plugins {
    id("com.google.gms.google-services")
}
```

### 3. **iOS Configuration** (If needed later)

For iOS deployment, add to `ios/Runner/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>REVERSED_CLIENT_ID</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>YOUR_REVERSED_CLIENT_ID_HERE</string>
        </array>
    </dict>
</array>
```

## Backend Integration

The Flutter app is configured to work with the existing backend Google authentication endpoint:
- **Endpoint**: `POST /auth/google`
- **Payload**: `{ "token": "google_access_token", "email": "user@example.com", "name": "User Name" }`
- **Response**: Standard JWT authentication response

## How It Works

### User Flow:
1. User taps "Continue with Google" button
2. Google Sign-In dialog opens
3. User selects Google account and grants permissions
4. App receives Google access token and user info
5. Token and user data sent to backend API
6. Backend validates token with Google and creates/finds user
7. Backend returns JWT token and user data
8. App stores JWT and user data locally
9. User is redirected to home screen

### Security:
- Google access tokens are validated by the backend
- JWT tokens are used for subsequent API calls
- Secure storage for all authentication data
- Proper error handling for failed authentications

## Testing the Integration

### Development Testing:
1. Run `flutter pub get` to install dependencies ✅
2. Run `flutter analyze` to check for issues ✅  
3. Test on device/emulator after configuring Google services

### Production Deployment:
1. Configure proper Google OAuth client IDs in Google Cloud Console
2. Update `Constants.googleClientId` with production client ID
3. Add proper signing certificates for Play Store releases
4. Ensure backend environment variables are set correctly

## Files Modified/Created

### New Files:
- `lib/services/google_signin_service.dart` - Google Sign-In service implementation

### Modified Files:
- `pubspec.yaml` - Added google_sign_in dependency
- `lib/providers/auth_provider.dart` - Added Google authentication methods
- `lib/services/api_service.dart` - Added Google auth API endpoint
- `lib/screens/auth/login_screen.dart` - Added Google Sign-In button and handler
- `lib/screens/auth/register_screen.dart` - Added Google Sign-In button and handler  
- `lib/config/constants.dart` - Added Google OAuth configuration

## Next Steps

1. **Configure Firebase/Google Services** (See configuration section above)
2. **Test on physical device** (Google Sign-In doesn't work well in emulators)
3. **Update Google Cloud Console** with proper package names and certificates
4. **Test backend integration** to ensure Google auth endpoint works correctly
5. **Deploy to staging environment** for complete testing

## Troubleshooting

### Common Issues:
- **"PlatformException(sign_in_failed)"**: Check Google services configuration
- **"Network error"**: Verify backend endpoint is working  
- **"Invalid client ID"**: Check client ID configuration in constants and Google Cloud Console
- **"Token verification failed"**: Backend may need to validate Google tokens properly

### Debug Tips:
- Check Flutter debug logs for detailed error messages
- Verify Google Cloud Console configuration
- Test backend endpoints independently
- Ensure internet permissions are set in AndroidManifest.xml