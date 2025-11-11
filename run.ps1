# Smart Book Translator Launcher
$host.ui.RawUI.WindowTitle = "Smart Book Translator"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Smart Book Translator" -ForegroundColor Cyan
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
Write-Host "Application is running!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

# Wait for frontend to fully start (Vite can take 5-10 seconds)
Write-Host "Waiting for frontend to start..." -ForegroundColor Yellow
$frontendPort = $null
$maxWait = 30
$waited = 0
$ports = @(5173, 3002, 3001, 3000, 3003, 3004)

while ($waited -lt $maxWait) {
    foreach ($port in $ports) {
        try {
            $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            if ($connection) {
                $frontendPort = $port
                break
            }
        } catch {
            # Port not ready yet
        }
    }
    
    if ($frontendPort) {
        break
    }
    
    Start-Sleep -Seconds 1
    $waited++
    if ($waited % 3 -eq 0) {
        Write-Host "  Still waiting for frontend... ($waited/$maxWait seconds)" -ForegroundColor Gray
    }
}

# Open browser automatically
Write-Host ""
if ($frontendPort) {
    Write-Host "Opening browser at http://localhost:$frontendPort..." -ForegroundColor Yellow
    Start-Sleep -Seconds 1  # Small delay to ensure server is fully ready
    try {
        Start-Process "http://localhost:$frontendPort"
        Write-Host "✓ Browser opened successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not open browser automatically. Please open http://localhost:$frontendPort manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Could not detect frontend port. Trying default port..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    try {
        Start-Process "http://localhost:5173"
        Write-Host "✓ Browser opened (using default port 5173)" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not open browser automatically. Please check the frontend output for the correct port and open it manually" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Press any key to stop..." -ForegroundColor Yellow

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Stopping servers..." -ForegroundColor Yellow
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue

Write-Host "Application stopped" -ForegroundColor Green
