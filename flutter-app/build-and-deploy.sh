#!/bin/bash
# APK Build and Website Upload Script
# Rajuit Fashion Store

echo "=== Rajuit Fashion Store APK Builder ==="

# Set variables
APP_NAME="rajuit_fashion_store"
VERSION="1.0.0"
WEBSITE_APK_DIR="../assets" # Adjust this path to your website assets folder

echo "📱 Building APK for $APP_NAME v$VERSION"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
flutter clean
rm -rf build/

# Get dependencies
echo "📦 Getting dependencies..."
flutter pub get

# Try multiple build approaches
echo "🔨 Attempting to build APK..."

# Method 1: Direct Flutter build
echo "Method 1: Standard Flutter build..."
flutter build apk --release --no-tree-shake-icons

if [ -f "build/app/outputs/flutter-apk/app-release.apk" ]; then
    echo "✅ APK built successfully with Flutter!"
    APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
else
    echo "❌ Flutter build failed, trying Gradle direct..."
    
    # Method 2: Direct Gradle build
    echo "Method 2: Direct Gradle build..."
    cd android
    ./gradlew assembleRelease
    cd ..
    
    if [ -f "build/app/outputs/apk/release/app-release.apk" ]; then
        echo "✅ APK built successfully with Gradle!"
        APK_PATH="build/app/outputs/apk/release/app-release.apk"
    else
        echo "❌ Gradle build failed, trying debug build..."
        
        # Method 3: Debug build (fallback)
        echo "Method 3: Debug build as fallback..."
        flutter build apk --debug
        
        if [ -f "build/app/outputs/flutter-apk/app-debug.apk" ]; then
            echo "⚠️ Debug APK built (use for testing only)"
            APK_PATH="build/app/outputs/flutter-apk/app-debug.apk"
        else
            echo "❌ All build methods failed!"
            exit 1
        fi
    fi
fi

# Get APK info
APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
echo "📊 APK Size: $APK_SIZE"

# Copy to website directory
echo "🌐 Preparing for website upload..."
NEW_APK_NAME="${APP_NAME}_v${VERSION}_$(date +%Y%m%d).apk"

# Copy APK to website assets
if [ -d "$WEBSITE_APK_DIR" ]; then
    cp "$APK_PATH" "$WEBSITE_APK_DIR/$NEW_APK_NAME"
    echo "✅ APK copied to website directory: $WEBSITE_APK_DIR/$NEW_APK_NAME"
else
    echo "⚠️ Website directory not found. Creating current directory copy..."
    cp "$APK_PATH" "$NEW_APK_NAME"
    echo "✅ APK saved as: $NEW_APK_NAME"
fi

# Generate download page snippet
cat > apk_download_snippet.html << EOF
<!-- Add this to your website download page -->
<div class="download-section">
    <h3>📱 Download Rajuit Fashion Store App</h3>
    <div class="download-info">
        <p><strong>Version:</strong> $VERSION</p>
        <p><strong>Size:</strong> $APK_SIZE</p>
        <p><strong>Updated:</strong> $(date +"%B %d, %Y")</p>
    </div>
    <a href="assets/$NEW_APK_NAME" 
       class="download-button"
       download="RajuitFashionStore.apk">
        📥 Download APK
    </a>
    <p><small>⚠️ Enable "Install from unknown sources" in your Android settings</small></p>
</div>

<style>
.download-section {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    text-align: center;
}

.download-info {
    margin: 15px 0;
}

.download-info p {
    margin: 5px 0;
    color: #666;
}

.download-button {
    display: inline-block;
    background: #007bff;
    color: white;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 5px;
    font-weight: bold;
    margin: 10px 0;
    transition: background 0.3s;
}

.download-button:hover {
    background: #0056b3;
    text-decoration: none;
    color: white;
}
</style>
EOF

echo "✅ Download page snippet created: apk_download_snippet.html"

# Summary
echo ""
echo "🎉 APK Build Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 APK File: $NEW_APK_NAME"
echo "📊 Size: $APK_SIZE"
echo "📅 Built: $(date)"
echo ""
echo "📋 Next Steps:"
echo "1. Upload the APK file to your website"
echo "2. Add the HTML snippet to your download page"
echo "3. Test the download link"
echo ""
echo "🔗 Website Integration:"
echo "- Copy apk_download_snippet.html content to your page"
echo "- Update the href path if needed"
echo "- Style to match your website theme"