# APK Build and Website Upload Script (PowerShell)
# Rajuit Fashion Store

Write-Host "=== Rajuit Fashion Store APK Builder ===" -ForegroundColor Cyan

# Set variables
$APP_NAME = "rajuit_fashion_store"
$VERSION = "1.0.0"
$WEBSITE_APK_DIR = "..\assets"  # Adjust this path to your website assets folder

Write-Host "📱 Building APK for $APP_NAME v$VERSION" -ForegroundColor Green

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
flutter clean
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue

# Get dependencies
Write-Host "📦 Getting dependencies..." -ForegroundColor Yellow
flutter pub get

# Try multiple build approaches
Write-Host "🔨 Attempting to build APK..." -ForegroundColor Yellow

$APK_PATH = $null

# Method 1: Direct Flutter build (without problematic flags)
Write-Host "Method 1: Standard Flutter build..." -ForegroundColor Cyan
try {
    flutter build apk --release --no-tree-shake-icons --no-shrink
    if (Test-Path "build\app\outputs\flutter-apk\app-release.apk") {
        Write-Host "✅ APK built successfully with Flutter!" -ForegroundColor Green
        $APK_PATH = "build\app\outputs\flutter-apk\app-release.apk"
    }
} catch {
    Write-Host "❌ Flutter build failed: $($_.Exception.Message)" -ForegroundColor Red
}

if (-not $APK_PATH) {
    # Method 2: Debug build (more likely to succeed)
    Write-Host "Method 2: Debug build as fallback..." -ForegroundColor Cyan
    try {
        flutter build apk --debug --no-tree-shake-icons
        if (Test-Path "build\app\outputs\flutter-apk\app-debug.apk") {
            Write-Host "⚠️ Debug APK built (use for testing only)" -ForegroundColor Yellow
            $APK_PATH = "build\app\outputs\flutter-apk\app-debug.apk"
        }
    } catch {
        Write-Host "❌ Debug build also failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if (-not $APK_PATH) {
    Write-Host "❌ All build methods failed!" -ForegroundColor Red
    Write-Host "🔧 Try these manual steps:" -ForegroundColor Yellow
    Write-Host "1. Run: flutter doctor -v" -ForegroundColor White
    Write-Host "2. Run: flutter clean && flutter pub get" -ForegroundColor White
    Write-Host "3. Check Android SDK and licenses" -ForegroundColor White
    exit 1
}

# Get APK info
$APK_SIZE = (Get-Item $APK_PATH).Length / 1MB
$APK_SIZE_STR = "{0:N1} MB" -f $APK_SIZE

Write-Host "📊 APK Size: $APK_SIZE_STR" -ForegroundColor Green

# Copy to website directory
Write-Host "🌐 Preparing for website upload..." -ForegroundColor Yellow
$NEW_APK_NAME = "${APP_NAME}_v${VERSION}_$(Get-Date -Format 'yyyyMMdd').apk"

# Copy APK to website assets
if (Test-Path $WEBSITE_APK_DIR) {
    Copy-Item $APK_PATH "$WEBSITE_APK_DIR\$NEW_APK_NAME"
    Write-Host "✅ APK copied to website directory: $WEBSITE_APK_DIR\$NEW_APK_NAME" -ForegroundColor Green
} else {
    Write-Host "⚠️ Website directory not found. Creating current directory copy..." -ForegroundColor Yellow
    Copy-Item $APK_PATH $NEW_APK_NAME
    Write-Host "✅ APK saved as: $NEW_APK_NAME" -ForegroundColor Green
}

# Generate download page snippet
$DATE_STRING = Get-Date -Format "MMMM dd, yyyy"
$HTML_SNIPPET = @"
<!-- Add this to your website download page -->
<div class="download-section">
    <h3>📱 Download Rajuit Fashion Store App</h3>
    <div class="download-info">
        <p><strong>Version:</strong> $VERSION</p>
        <p><strong>Size:</strong> $APK_SIZE_STR</p>
        <p><strong>Updated:</strong> $DATE_STRING</p>
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
"@

Set-Content -Path "apk_download_snippet.html" -Value $HTML_SNIPPET -Encoding UTF8
Write-Host "✅ Download page snippet created: apk_download_snippet.html" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "🎉 APK Build Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📱 APK File: $NEW_APK_NAME" -ForegroundColor White
Write-Host "📊 Size: $APK_SIZE_STR" -ForegroundColor White
Write-Host "📅 Built: $(Get-Date)" -ForegroundColor White
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Upload the APK file to your website" -ForegroundColor White
Write-Host "2. Add the HTML snippet to your download page" -ForegroundColor White
Write-Host "3. Test the download link" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Website Integration:" -ForegroundColor Yellow
Write-Host "- Copy apk_download_snippet.html content to your page" -ForegroundColor White
Write-Host "- Update the href path if needed" -ForegroundColor White
Write-Host "- Style to match your website theme" -ForegroundColor White