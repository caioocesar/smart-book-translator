# Smart Book Translator - Update Script (Windows)
# Run this to update to the latest version

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📦 Smart Book Translator - Update" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Print-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Print-Info {
    param($Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

# Navigate to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Updating Smart Book Translator..."
Write-Host ""

# Check if git is available
try {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Print-Info "Pulling latest changes from git..."
        git pull 2>$null
    } else {
        Print-Info "Git not available - manual update"
    }
} catch {
    Print-Info "Not a git repository or no changes available"
}

# Backup database
if (Test-Path "backend\data\translator.db") {
    Print-Info "Backing up database..."
    New-Item -ItemType Directory -Force -Path "backups" | Out-Null
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item "backend\data\translator.db" "backups\translator_backup_$timestamp.db"
    Print-Success "Database backed up to backups\"
}

# Update backend dependencies
Write-Host ""
Print-Info "Updating backend dependencies..."
Set-Location backend
npm install
Print-Success "Backend dependencies updated"

Set-Location ..

# Update frontend dependencies
Print-Info "Updating frontend dependencies..."
Set-Location frontend
npm install
Print-Success "Frontend dependencies updated"

Set-Location ..

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ Update Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Changes applied. Your data and settings are preserved."
Write-Host ""
Write-Host "To start the application:"
Write-Host "  .\run.bat (or .\run.ps1)"
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")



