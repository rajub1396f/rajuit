#!/bin/bash

# JWT Backend Deployment Script for Render
# Run this in: D:\raju-agency (or on your deployment machine)

echo "🚀 Deploying JWT Authentication to Render..."
echo ""

# Step 1: Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed or not in PATH"
    echo "Please install Git or make sure it's in your system PATH"
    exit 1
fi

# Step 2: Check repository status
echo "📊 Checking repository status..."
cd "D:\raju-agency"
git status

# Step 3: Add files
echo ""
echo "📝 Adding files to git..."
git add server.js setup-tokens-table.sql

# Step 4: Commit
echo "💾 Committing changes..."
git commit -m "✨ feat: Add JWT token authentication with Neon database integration

- Added generateToken() function for JWT creation
- Added saveToken() function to store tokens in user_tokens table
- Added verifyTokenMiddleware() for protected endpoints
- Implemented POST /api/login with JWT token generation
- Implemented POST /api/register with JWT token generation
- Implemented POST /api/logout to invalidate tokens
- Implemented GET /api/user/profile protected endpoint
- Implemented POST /api/refresh-token for token renewal
- Tokens expire in 30 days and are stored in Neon database
- All passwords hashed with bcrypt
- Full compatibility with Flutter mobile app"

# Step 5: Push to Render
echo ""
echo "🌐 Pushing to Render (auto-deployment)..."
git push origin main

# Step 6: Confirmation
echo ""
echo "✅ Pushed to Render!"
echo ""
echo "Next steps:"
echo "1. Wait 2-5 minutes for Render to build and deploy"
echo "2. Check deployment status: https://dashboard.render.com/"
echo "3. Create user_tokens table in Neon (see setup-tokens-table.sql)"
echo "4. Test endpoints with Flutter app"
