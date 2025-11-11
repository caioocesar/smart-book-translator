# Smart Book Translator - Desktop Launcher (Silent)
# Starts servers and opens the application in browser without showing terminal windows

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if already running
$backendRunning = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($backendRunning) {
    Start-Process "http://localhost:5173"
    exit
}

# Start backend in background (minimized window)
$backend = Start-Process powershell -ArgumentList "-WindowStyle Minimized", "-Command", "cd '$scriptPath\backend'; npm start" -PassThru

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend in background (minimized window)
$frontend = Start-Process powershell -ArgumentList "-WindowStyle Minimized", "-Command", "cd '$scriptPath\frontend'; npm run dev" -PassThru

# Wait for frontend to start and detect port
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
}

# Open browser
if ($frontendPort) {
    Start-Sleep -Seconds 1  # Small delay to ensure server is fully ready
    Start-Process "http://localhost:$frontendPort"
} else {
    # Fallback to default port
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:5173"
}

# Exit (servers run in background)
exit

