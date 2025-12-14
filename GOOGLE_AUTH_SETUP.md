# Google Authentication Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown and select **"New Project"**
3. Enter project name: `Raju IT Agency`
4. Click **"Create"**

## Step 2: Enable Google+ API

1. In your project, go to **"APIs & Services" > "Library"**
2. Search for **"Google+ API"**
3. Click on it and press **"Enable"**

## Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Select **"External"** user type
3. Click **"Create"**
4. Fill in the required information:
   - **App name:** Raju IT Agency
   - **User support email:** Your email
   - **Developer contact email:** Your email
5. Click **"Save and Continue"**
6. Skip the "Scopes" step (click "Save and Continue")
7. Add test users if needed
8. Click **"Save and Continue"**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "OAuth client ID"**
3. Select **"Web application"**
4. Enter name: `Raju IT Web Client`
5. Add **Authorized JavaScript origins:**
   ```
   https://rajuit.online
   http://localhost:3000
   ```
6. Add **Authorized redirect URIs:**
   ```
   https://rajuit.online/auth/google/callback
   http://localhost:3000/auth/google/callback
   ```
7. Click **"Create"**
8. **Copy the Client ID and Client Secret** - you'll need these!

## Step 5: Add Environment Variables

### For Local Development (.env file):
```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### For Render Dashboard:
1. Go to https://dashboard.render.com
2. Select your `raju-agency` service
3. Go to **"Environment"** tab
4. Add these environment variables:
   - `GOOGLE_CLIENT_ID` = Your Google Client ID
   - `GOOGLE_CLIENT_SECRET` = Your Google Client Secret
   - `GOOGLE_CALLBACK_URL` = `https://rajuit.online/auth/google/callback`
5. Click **"Save Changes"**

## Step 6: Install Dependencies

Run this command in your local project:
```bash
npm install
```

## Step 7: Test the Integration

1. Go to your website homepage
2. Click **"Login"**
3. Click **"Continue with Google"** button
4. Select your Google account
5. You should be redirected back to the homepage, logged in

## Features

✅ Users can sign in with their Google account
✅ No password required
✅ Email is automatically verified
✅ User profile information (name, email) is saved
✅ Works with the "Add to Cart" login flow

## Troubleshooting

**Error: redirect_uri_mismatch**
- Make sure the callback URL in Google Console exactly matches your environment variable
- Check for typos or missing slashes

**Error: invalid_client**
- Double-check your Client ID and Client Secret
- Make sure they're properly set in environment variables

**Not redirecting after login**
- Check browser console for errors
- Verify the callback URL is accessible
- Check that JWT_SECRET is set in environment variables
