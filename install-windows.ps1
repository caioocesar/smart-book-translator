# Smart Book Translator - Windows Installation Script
# This script will install all dependencies and set up the application

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📚 Smart Book Translator Installation" -ForegroundColor Cyan
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

# Check if Node.js is installed
Write-Host "Checking Node.js installation..."
try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($versionNumber -lt 18) {
        Print-Error "Node.js version must be 18 or higher. Current version: $nodeVersion"
        Write-Host "Please install Node.js from https://nodejs.org/"
        exit 1
    }
    
    Print-Success "Node.js $nodeVersion is installed"
} catch {
    Print-Error "Node.js is not installed!"
    Write-Host "Please install Node.js 18 or higher from https://nodejs.org/"
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm -v
    Print-Success "npm $npmVersion is installed"
} catch {
    Print-Error "npm is not installed!"
    exit 1
}

# Navigate to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Install backend dependencies
Write-Host ""
Write-Host "Installing backend dependencies..."
Set-Location backend

if (Test-Path "package.json") {
    npm install
    Print-Success "Backend dependencies installed"
} else {
    Print-Error "backend/package.json not found!"
    exit 1
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Print-Info "Creating .env file from example..."
    Copy-Item ".env.example" ".env"
    Print-Success ".env file created"
}

# Create necessary directories
$dirs = @("uploads", "outputs", "data", "temp")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Print-Success "Created necessary directories"

Set-Location ..

# Install frontend dependencies
Write-Host ""
Write-Host "Installing frontend dependencies..."
Set-Location frontend

if (Test-Path "package.json") {
    npm install
    Print-Success "Frontend dependencies installed"
} else {
    Print-Error "frontend/package.json not found!"
    exit 1
}

Set-Location ..

# Create launcher batch file
Write-Host ""
Write-Host "Creating launcher script..."

$batchContent = @'
@echo off
title Smart Book Translator

echo ==========================================
echo 📚 Smart Book Translator
echo ==========================================
echo.

cd /d "%~dp0"

echo Starting backend server...
start "Backend" cmd /k "cd backend && npm start"

timeout /t 3 /nobreak > nul

echo Starting frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo ✅ Application is running!
echo ==========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Close this window to stop the application
echo.

pause
'@

$batchContent | Out-File -FilePath "run.bat" -Encoding ASCII
Print-Success "Launcher script created (run.bat)"

# Create PowerShell launcher
$ps1Content = @'
# Smart Book Translator Launcher
$host.ui.RawUI.WindowTitle = "Smart Book Translator"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📚 Smart Book Translator" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Starting backend server..." -ForegroundColor Yellow
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\backend'; npm start" -PassThru

Start-Sleep -Seconds 3

Write-Host "Starting frontend..." -ForegroundColor Yellow
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\frontend'; npm run dev" -PassThru

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ Application is running!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to stop..." -ForegroundColor Yellow

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Stopping servers..." -ForegroundColor Yellow
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue

Write-Host "Application stopped" -ForegroundColor Green
'@

$ps1Content | Out-File -FilePath "run.ps1" -Encoding UTF8
Print-Success "PowerShell launcher created (run.ps1)"

# Create desktop shortcut
Write-Host ""
Print-Info "Creating desktop shortcut..."

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Smart Book Translator.lnk"
$targetPath = Join-Path $scriptPath "run.bat"

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.WorkingDirectory = $scriptPath
$Shortcut.Description = "Smart Book Translator - Translate documents using AI"
$Shortcut.Save()

Print-Success "Desktop shortcut created"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application, you can:"
Write-Host "  1. Double-click 'Smart Book Translator' on your desktop"
Write-Host "  2. Run: ./run.bat (or ./run.ps1)"
Write-Host ""
Write-Host "⚠️  Important: This program is for personal use only." -ForegroundColor Yellow
Write-Host "    Do not use for commercial purposes or copyright infringement." -ForegroundColor Yellow
Write-Host ""
Write-Host "For more information, see README.md"
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


