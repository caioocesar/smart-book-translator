# Ollama Installation Script for Windows
# This script downloads and installs Ollama on Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ollama Installation for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script requires Administrator privileges." -ForegroundColor Yellow
    Write-Host "   Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if Ollama is already installed
Write-Host "Checking if Ollama is already installed..." -ForegroundColor Yellow

$ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue

if ($ollamaPath) {
    Write-Host "✓ Ollama is already installed at: $($ollamaPath.Source)" -ForegroundColor Green
    
    # Get version
    $version = & ollama --version 2>&1
    Write-Host "  Version: $version" -ForegroundColor Green
    Write-Host ""
    
    $response = Read-Host "Do you want to reinstall Ollama? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "Installation cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Download Ollama installer
Write-Host ""
Write-Host "Downloading Ollama installer..." -ForegroundColor Yellow

$downloadUrl = "https://ollama.com/download/OllamaSetup.exe"
$installerPath = "$env:TEMP\OllamaSetup.exe"

try {
    # Use WebClient for download with progress
    $webClient = New-Object System.Net.WebClient
    
    # Register progress event
    Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged -SourceIdentifier WebClient.DownloadProgressChanged -Action {
        Write-Progress -Activity "Downloading Ollama" -Status "$($EventArgs.ProgressPercentage)% Complete" -PercentComplete $EventArgs.ProgressPercentage
    } | Out-Null
    
    # Download file
    $webClient.DownloadFile($downloadUrl, $installerPath)
    
    # Unregister event
    Unregister-Event -SourceIdentifier WebClient.DownloadProgressChanged -ErrorAction SilentlyContinue
    
    Write-Host "✓ Download completed!" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to download Ollama installer" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download manually from: https://ollama.com/download" -ForegroundColor Yellow
    exit 1
}

# Run installer
Write-Host ""
Write-Host "Running Ollama installer..." -ForegroundColor Yellow
Write-Host "  Please follow the installation wizard." -ForegroundColor Cyan
Write-Host ""

try {
    Start-Process -FilePath $installerPath -Wait -Verb RunAs
    Write-Host "✓ Installation completed!" -ForegroundColor Green
} catch {
    Write-Host "✗ Installation failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

# Clean up installer
Remove-Item $installerPath -ErrorAction SilentlyContinue

# Verify installation
Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Yellow

Start-Sleep -Seconds 2

$ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue

if ($ollamaPath) {
    Write-Host "✓ Ollama installed successfully!" -ForegroundColor Green
    
    $version = & ollama --version 2>&1
    Write-Host "  Version: $version" -ForegroundColor Green
    Write-Host "  Location: $($ollamaPath.Source)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Ollama command not found in PATH" -ForegroundColor Yellow
    Write-Host "   You may need to restart your terminal or computer." -ForegroundColor Yellow
}

# Ask if user wants to start Ollama service
Write-Host ""
$response = Read-Host "Do you want to start Ollama service now? (Y/n)"

if ($response -ne 'n' -and $response -ne 'N') {
    Write-Host ""
    Write-Host "Starting Ollama service..." -ForegroundColor Yellow
    
    # Start Ollama in background
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    
    Start-Sleep -Seconds 3
    
    Write-Host "✓ Ollama service started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ollama is now running at: http://localhost:11434" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Ollama service will start automatically on system boot" -ForegroundColor White
Write-Host "  2. Download a model: ollama pull llama3.2:3b" -ForegroundColor White
Write-Host "  3. Or use the Smart Book Translator UI to download models" -ForegroundColor White
Write-Host ""
Write-Host "For more information, visit: https://ollama.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
