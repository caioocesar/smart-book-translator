# Smart Book Translator - Complete Stop Script
# Stops backend, frontend, Docker containers, and frees WSL memory

Write-Host ""
Write-Host "🛑 Stopping Smart Book Translator (Complete Cleanup)..." -ForegroundColor Cyan
Write-Host ""

# Stop Node.js processes on common ports
Write-Host "Stopping Node.js servers..." -ForegroundColor Yellow

$ports = @(5000, 5173, 3000, 3001, 3002)
foreach ($port in $ports) {
    try {
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $processes) {
            if ($pid) {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "  ✓ Stopped process on port $port (PID: $pid)" -ForegroundColor Green
            }
        }
    } catch {
        # Port not in use or no permission
    }
}

# Stop Docker containers
Write-Host ""
Write-Host "Stopping Docker containers..." -ForegroundColor Yellow

if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        # Stop LibreTranslate containers
        $containers = docker ps -a --filter "ancestor=libretranslate/libretranslate" --format "{{.ID}}" 2>&1
        if ($containers -and $containers -notmatch "error") {
            $containers | ForEach-Object {
                if ($_) {
                    docker stop $_ 2>&1 | Out-Null
                    docker rm $_ 2>&1 | Out-Null
                    Write-Host "  ✓ Stopped LibreTranslate container: $_" -ForegroundColor Green
                }
            }
        }
        
        # Stop containers by name
        $namedContainers = docker ps -a --filter "name=libretranslate" --format "{{.ID}}" 2>&1
        if ($namedContainers -and $namedContainers -notmatch "error") {
            $namedContainers | ForEach-Object {
                if ($_) {
                    docker stop $_ 2>&1 | Out-Null
                    docker rm $_ 2>&1 | Out-Null
                    Write-Host "  ✓ Stopped container: $_" -ForegroundColor Green
                }
            }
        }
        
        # Stop docker-compose services
        if (Test-Path "docker-compose.yml") {
            docker-compose down 2>&1 | Out-Null
            Write-Host "  ✓ Stopped docker-compose services" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠ Error stopping Docker containers: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ℹ Docker not found, skipping Docker cleanup" -ForegroundColor Gray
}

# Free WSL memory
Write-Host ""
Write-Host "Freeing WSL memory..." -ForegroundColor Yellow
try {
    wsl --shutdown 2>&1 | Out-Null
    Write-Host "  ✓ WSL shutdown complete - Memory freed" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not shutdown WSL (may need Administrator): $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Complete cleanup finished!" -ForegroundColor Green
Write-Host "💡 Check Task Manager - vmmemWSL should now use much less memory" -ForegroundColor Cyan
Write-Host ""
