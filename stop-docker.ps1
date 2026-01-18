# Smart Book Translator - Stop Docker Containers and Free WSL Memory
# This script stops all Docker containers and helps free WSL memory

Write-Host ""
Write-Host "🐳 Stopping Docker Containers and Freeing WSL Memory..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "✓ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ Docker not found. Skipping Docker cleanup." -ForegroundColor Yellow
    exit 0
}

# Stop LibreTranslate container
Write-Host ""
Write-Host "Stopping LibreTranslate container..." -ForegroundColor Yellow
try {
    $containers = docker ps -a --filter "ancestor=libretranslate/libretranslate" --format "{{.ID}} {{.Names}}" 2>&1
    if ($containers -and $containers -notmatch "error|not found") {
        $containerIds = ($containers | ForEach-Object { $_.Split()[0] }) | Where-Object { $_ }
        foreach ($id in $containerIds) {
            docker stop $id 2>&1 | Out-Null
            docker rm $id 2>&1 | Out-Null
            Write-Host "  ✓ Stopped and removed container: $id" -ForegroundColor Green
        }
    } else {
        Write-Host "  ℹ No LibreTranslate containers found" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠ Error stopping containers: $_" -ForegroundColor Yellow
}

# Stop containers by name
Write-Host ""
Write-Host "Stopping containers named 'libretranslate'..." -ForegroundColor Yellow
try {
    $namedContainers = docker ps -a --filter "name=libretranslate" --format "{{.ID}} {{.Names}}" 2>&1
    if ($namedContainers -and $namedContainers -notmatch "error|not found") {
        $containerIds = ($namedContainers | ForEach-Object { $_.Split()[0] }) | Where-Object { $_ }
        foreach ($id in $containerIds) {
            docker stop $id 2>&1 | Out-Null
            docker rm $id 2>&1 | Out-Null
            Write-Host "  ✓ Stopped and removed container: $id" -ForegroundColor Green
        }
    } else {
        Write-Host "  ℹ No containers with name 'libretranslate' found" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠ Error stopping containers: $_" -ForegroundColor Yellow
}

# Stop docker-compose services if docker-compose.yml exists
if (Test-Path "docker-compose.yml") {
    Write-Host ""
    Write-Host "Stopping docker-compose services..." -ForegroundColor Yellow
    try {
        docker-compose down 2>&1 | Out-Null
        Write-Host "  ✓ Stopped docker-compose services" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Error stopping docker-compose: $_" -ForegroundColor Yellow
    }
}

# Show remaining containers
Write-Host ""
Write-Host "Remaining Docker containers:" -ForegroundColor Cyan
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1

# Free WSL memory (shutdown WSL)
Write-Host ""
Write-Host "Freeing WSL memory..." -ForegroundColor Yellow
Write-Host "  ℹ This will shutdown WSL2 to free memory" -ForegroundColor Gray
Write-Host "  ℹ WSL will restart automatically when you use Docker again" -ForegroundColor Gray

try {
    # Shutdown WSL (this frees memory)
    wsl --shutdown 2>&1 | Out-Null
    Write-Host "  ✓ WSL shutdown complete - Memory should be freed now" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Tip: Check Task Manager - vmmemWSL should now use much less memory" -ForegroundColor Cyan
} catch {
    Write-Host "  ⚠ Could not shutdown WSL: $_" -ForegroundColor Yellow
    Write-Host "  ℹ You may need to run this script as Administrator" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
