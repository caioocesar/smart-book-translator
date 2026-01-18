# Fix Node.js PATH on Windows
# Adds Node.js to the PATH for the current PowerShell session.

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fixing Node.js PATH (current session)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$possiblePaths = @(
  "C:\Program Files\nodejs",
  "$env:LOCALAPPDATA\Programs\nodejs",
  "$env:ProgramFiles\nodejs",
  "$env:ProgramFiles(x86)\nodejs"
)

$nodePath = $null
foreach ($p in $possiblePaths) {
  if (Test-Path (Join-Path $p "node.exe")) {
    $nodePath = $p
    break
  }
}

if ($nodePath) {
  Write-Host "[OK] Node.js found at: $nodePath" -ForegroundColor Green

  # Add to PATH for this session
  $env:PATH = "$nodePath;$env:PATH"
  Write-Host "[OK] Added Node.js to PATH for this PowerShell session" -ForegroundColor Green
  Write-Host ""

  # Verify it works
  try {
    $nodeVersion = & (Join-Path $nodePath "node.exe") -v
    $npmVersion  = & (Join-Path $nodePath "npm.cmd") -v

    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan
    Write-Host "npm version:     $npmVersion" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Node.js is ready to use in this session!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""

    Write-Host "IMPORTANT: This fix is temporary (only for this session)." -ForegroundColor Yellow
    Write-Host "For a permanent fix:" -ForegroundColor Yellow
    Write-Host "  - Reinstall Node.js LTS from https://nodejs.org/" -ForegroundColor White
    Write-Host "  - Make sure 'Add to PATH' is enabled" -ForegroundColor White
    Write-Host "  - Close and reopen PowerShell/Terminal" -ForegroundColor White
    Write-Host ""

    Write-Host "Next, you can run:" -ForegroundColor Green
    Write-Host "  .\smart-book-translator.bat" -ForegroundColor White
    Write-Host "  or .\install-windows.ps1 (first-time install)" -ForegroundColor White
    Write-Host ""
  } catch {
    Write-Host "[ERROR] Node.js was found but could not be executed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "[ERROR] Node.js not found in common install locations." -ForegroundColor Red
  Write-Host ""
  Write-Host "Install Node.js LTS from: https://nodejs.org/" -ForegroundColor Yellow
  Write-Host "During installation, make sure 'Add to PATH' is enabled." -ForegroundColor Yellow
  Write-Host "Then close and reopen PowerShell and try again." -ForegroundColor Yellow
  Write-Host ""
  exit 1
}



