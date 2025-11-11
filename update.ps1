# Smart Book Translator - Update Script (Windows)
# Run this to update to the latest version
# This script will stop the app, update, and optionally restart it

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

function Stop-Application {
    Print-Info "Stopping application processes..."
    
    # Find and stop Node.js processes related to the app
    $backendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*backend*" -or $_.Path -like "*smart-book-translator*backend*"
    }
    
    $frontendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*frontend*" -or $_.Path -like "*smart-book-translator*frontend*"
    }
    
    # Try to stop by port (more reliable)
    $backendPort = 5000
    $frontendPort = 5173
    
    try {
        $backendConnections = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue
        if ($backendConnections) {
            $backendPid = $backendConnections.OwningProcess
            if ($backendPid) {
                Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
                Print-Success "Stopped backend process (PID: $backendPid)"
            }
        }
    } catch {
        # Port might not be in use
    }
    
    try {
        $frontendConnections = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue
        if ($frontendConnections) {
            $frontendPid = $frontendConnections.OwningProcess
            if ($frontendPid) {
                Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
                Print-Success "Stopped frontend process (PID: $frontendPid)"
            }
        }
    } catch {
        # Port might not be in use
    }
    
    # Stop any remaining Node processes that might be related
    if ($backendProcesses) {
        foreach ($proc in $backendProcesses) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Print-Success "Stopped process (PID: $($proc.Id))"
            } catch {
                # Process might have already stopped
            }
        }
    }
    
    if ($frontendProcesses) {
        foreach ($proc in $frontendProcesses) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Print-Success "Stopped process (PID: $($proc.Id))"
            } catch {
                # Process might have already stopped
            }
        }
    }
    
    Start-Sleep -Seconds 2
    Print-Success "Application stopped"
}

# Navigate to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Updating Smart Book Translator..."
Write-Host ""

# Ask if user wants to stop the app first
$stopApp = Read-Host "Stop the application before updating? (Y/N) [Y]"
if ([string]::IsNullOrWhiteSpace($stopApp) -or $stopApp -eq "Y" -or $stopApp -eq "y") {
    Stop-Application
}

# Check if git is available
try {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Print-Info "Pulling latest changes from git..."
        git pull 2>$null
        if ($LASTEXITCODE -eq 0) {
            Print-Success "Git pull completed"
        } else {
            Print-Info "No changes or not a git repository"
        }
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
if ($LASTEXITCODE -eq 0) {
    Print-Success "Backend dependencies updated"
} else {
    Print-Error "Failed to update backend dependencies"
    Set-Location ..
    exit 1
}

Set-Location ..

# Update frontend dependencies
Print-Info "Updating frontend dependencies..."
Set-Location frontend
npm install
if ($LASTEXITCODE -eq 0) {
    Print-Success "Frontend dependencies updated"
} else {
    Print-Error "Failed to update frontend dependencies"
    Set-Location ..
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ Update Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Changes applied. Your data and settings are preserved."
Write-Host ""

# Ask if user wants to restart the app
$restartApp = Read-Host "Start the application now? (Y/N) [Y]"
if ([string]::IsNullOrWhiteSpace($restartApp) -or $restartApp -eq "Y" -or $restartApp -eq "y") {
    Write-Host ""
    Print-Info "Starting application..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath'; .\run.ps1"
    Print-Success "Application starting in new window"
} else {
    Write-Host ""
    Write-Host "To start the application manually:"
    Write-Host "  .\run.bat (or .\run.ps1)"
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")



