# Install additional dependencies for Smart Book Translator
# Run this from the backend directory

Write-Host "Installing additional backend dependencies..." -ForegroundColor Cyan

# Check if we're in the backend directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Please run this script from the backend directory." -ForegroundColor Red
    exit 1
}

# Install natural for sentence processing (optional - we have fallback)
Write-Host "`nInstalling natural library (for advanced sentence splitting)..." -ForegroundColor Yellow
npm install natural --save

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ natural installed successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Failed to install natural, but the app will work with built-in regex fallback" -ForegroundColor Yellow
}

Write-Host "`n✓ Dependencies installation complete!" -ForegroundColor Green
Write-Host "The application will work even if some optional dependencies failed to install." -ForegroundColor Cyan
