# Smart Book Translator - Windows Installation Script
# This script will install all dependencies and set up the application

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Smart Book Translator Installation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Print-Success {
    param($Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Print-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Print-Info {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Yellow
}

# Check if Node.js is installed
Write-Host "Checking Node.js installation..."
$nodeFound = $false
$nodePath = $null

try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($versionNumber -lt 18) {
        Print-Error "Node.js version must be 18 or higher. Current version: $nodeVersion"
        Write-Host ""
        Write-Host "Por favor, atualize o Node.js:" -ForegroundColor Yellow
        Write-Host "  1. Acesse: https://nodejs.org/" -ForegroundColor White
        Write-Host "  2. Baixe a versao LTS (18 ou superior)" -ForegroundColor White
        Write-Host "  3. Execute o instalador e siga as instrucoes" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    
    Print-Success "Node.js $nodeVersion is installed"
    $nodeFound = $true
} catch {
    # Node.js não encontrado no PATH, tentar localizar manualmente
    Print-Info "Node.js não encontrado no PATH. Procurando instalação..."
    
    $possiblePaths = @(
        "C:\Program Files\nodejs",
        "$env:LOCALAPPDATA\Programs\nodejs",
        "$env:ProgramFiles\nodejs",
        "$env:ProgramFiles(x86)\nodejs"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path "$path\node.exe") {
            $nodePath = $path
            Print-Success "Node.js encontrado em: $path"
            
            # Adicionar ao PATH da sessão atual
            $env:PATH = "$path;$env:PATH"
            
            # Verificar versão
            try {
                $nodeVersion = & "$path\node.exe" -v
                $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
                
                if ($versionNumber -lt 18) {
                    Print-Error "Node.js version must be 18 or higher. Current version: $nodeVersion"
                    exit 1
                }
                
                Print-Success "Node.js $nodeVersion configurado e pronto para uso"
                $nodeFound = $true
                break
            } catch {
                Print-Error "Erro ao verificar versão do Node.js"
            }
        }
    }
    
    if (-not $nodeFound) {
        Print-Error "Node.js não está instalado ou não foi encontrado!"
        Write-Host ""
        Write-Host "IMPORTANTE: Este instalador instala as dependencias do projeto," -ForegroundColor Yellow
        Write-Host "mas o Node.js precisa ser instalado manualmente primeiro!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Como instalar o Node.js:" -ForegroundColor Cyan
        Write-Host "  1. Acesse: https://nodejs.org/" -ForegroundColor White
        Write-Host "  2. Baixe a versao LTS (recomendada)" -ForegroundColor White
        Write-Host "  3. Execute o instalador .msi" -ForegroundColor White
        Write-Host "  4. Certifique-se de marcar 'Add to PATH' durante a instalacao" -ForegroundColor White
        Write-Host "  5. Feche e reabra o PowerShell" -ForegroundColor White
        Write-Host "  6. Execute este script novamente: .\install-windows.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "Apos instalar o Node.js, este script ira:" -ForegroundColor Green
        Write-Host "  - Instalar dependencias do backend (npm packages)" -ForegroundColor White
        Write-Host "  - Instalar dependencias do frontend (npm packages)" -ForegroundColor White
        Write-Host "  - Criar arquivos de configuracao" -ForegroundColor White
        Write-Host "  - Criar scripts de inicializacao" -ForegroundColor White
        Write-Host ""
        Write-Host "OU execute: .\fix-node-path.ps1 para tentar corrigir o PATH" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}

# Check if npm is installed
try {
    $npmVersion = npm -v
    Print-Success "npm $npmVersion is installed"
} catch {
    # Tentar usar caminho completo se npm não estiver no PATH
    if ($nodePath) {
        try {
            $npmVersion = & "$nodePath\npm.cmd" -v
            Print-Success "npm $npmVersion is installed"
            # Adicionar npm ao PATH também
            $env:PATH = "$nodePath;$env:PATH"
        } catch {
            Print-Error "npm is not installed!"
            exit 1
        }
    } else {
        Print-Error "npm is not installed!"
        exit 1
    }
}

# Navigate to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Install backend dependencies
Write-Host ""
Write-Host "Installing backend dependencies..."
Set-Location backend

if (Test-Path "package.json") {
    # Try to install with build from source flag first
    Write-Host "Attempting to install dependencies (this may take a few minutes)..." -ForegroundColor Yellow
    
    # Check if Python is available
    $pythonAvailable = $false
    try {
        $pythonVersion = python --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pythonAvailable = $true
            Print-Success "Python found: $pythonVersion"
        }
    } catch {
        try {
            $pythonVersion = py --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                $pythonAvailable = $true
                Print-Success "Python found: $pythonVersion"
            }
        } catch {
            # Python not found
        }
    }
    
    if (-not $pythonAvailable) {
        Print-Info "Python not found in PATH. better-sqlite3 may fail to compile."
        Write-Host ""
        Write-Host "better-sqlite3 requires Python and Visual Studio Build Tools to compile." -ForegroundColor Yellow
        Write-Host "Options:" -ForegroundColor Cyan
        Write-Host "  1. Install Python and Build Tools, then run this script again" -ForegroundColor White
        Write-Host "  2. Run: .\install-build-tools.ps1 for automated installation" -ForegroundColor White
        Write-Host "  3. Continue anyway (may fail)" -ForegroundColor White
        Write-Host ""
        $continue = Read-Host "Continue installation? (S/N)"
        if ($continue -ne "S" -and $continue -ne "s") {
            Write-Host ""
            Write-Host "Installation cancelled. Please install Python and Build Tools first." -ForegroundColor Yellow
            Write-Host "Run: .\install-build-tools.ps1 for help" -ForegroundColor Yellow
            Set-Location ..
            exit 1
        }
    }
    
    # Configurar PYTHON se ainda não estiver configurado
    if (-not $env:PYTHON) {
        # Tentar encontrar Python
        $pythonExe = $null
        $pythonPaths = @(
            "$env:LOCALAPPDATA\Programs\Python\Python*",
            "$env:ProgramFiles\Python*",
            "C:\Python*"
        )
        
        foreach ($pathPattern in $pythonPaths) {
            $pythonDirs = Get-ChildItem -Path $pathPattern -Directory -ErrorAction SilentlyContinue
            foreach ($dir in $pythonDirs) {
                $testExe = Join-Path $dir.FullName "python.exe"
                if (Test-Path $testExe) {
                    try {
                        $version = & $testExe --version 2>&1
                        if ($version -match "Python \d+\.\d+") {
                            $pythonExe = $testExe
                            break
                        }
                    } catch {
                        # Continuar procurando
                    }
                }
            }
            if ($pythonExe) { break }
        }
        
        if ($pythonExe) {
            $env:PYTHON = $pythonExe
            $pythonDir = Split-Path -Parent $pythonExe
            $env:PATH = "$pythonDir;$env:PATH"
            Print-Info "Python configurado: $pythonExe"
        }
    }
    
    # Configurar PYTHON se ainda não estiver configurado
    if (-not $env:PYTHON) {
        # Tentar encontrar Python
        $pythonExe = $null
        $pythonPaths = @(
            "$env:LOCALAPPDATA\Programs\Python\Python*",
            "$env:ProgramFiles\Python*",
            "C:\Python*"
        )
        
        foreach ($pathPattern in $pythonPaths) {
            $pythonDirs = Get-ChildItem -Path $pathPattern -Directory -ErrorAction SilentlyContinue
            foreach ($dir in $pythonDirs) {
                $testExe = Join-Path $dir.FullName "python.exe"
                if (Test-Path $testExe) {
                    try {
                        $version = & $testExe --version 2>&1
                        if ($version -match "Python \d+\.\d+") {
                            $pythonExe = $testExe
                            $pythonDir = Split-Path -Parent $testExe
                            $env:PATH = "$pythonDir;$env:PATH"
                            $env:PYTHON = $testExe
                            Print-Info "Python encontrado e configurado: $testExe"
                            break
                        }
                    } catch {
                        # Continuar procurando
                    }
                }
            }
            if ($pythonExe) { break }
        }
    }
    
    # Try installing with npm
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Print-Error "Failed to install backend dependencies"
        Write-Host ""
        Write-Host "This is likely because better-sqlite3 needs to compile native code." -ForegroundColor Yellow
        Write-Host "You need:" -ForegroundColor Yellow
        Write-Host "  1. Python 3.6+ (https://www.python.org/downloads/)" -ForegroundColor White
        Write-Host "  2. Visual Studio Build Tools (https://aka.ms/vs/17/release/vs_buildtools.exe)" -ForegroundColor White
        Write-Host ""
        Write-Host "Run this script for automated installation:" -ForegroundColor Cyan
        Write-Host "  .\install-python-windows.ps1  (instala Python)" -ForegroundColor White
        Write-Host "  .\fix-python-config.ps1        (configura Python para npm)" -ForegroundColor White
        Write-Host ""
        Write-Host "IMPORTANTE: Apos instalar Python, FECHE E REABRA o PowerShell!" -ForegroundColor Yellow
        Write-Host "Depois execute: .\fix-python-config.ps1" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Or install manually and run this script again." -ForegroundColor Yellow
        Set-Location ..
        exit 1
    } else {
        Print-Success "Backend dependencies installed"
    }
} else {
    Print-Error "backend/package.json not found!"
    Set-Location ..
    exit 1
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Print-Info "Creating .env file from example..."
        Copy-Item ".env.example" ".env"
        Print-Success ".env file created"
    } else {
        Print-Info ".env.example not found, creating basic .env file..."
        @"
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Print-Success ".env file created"
    }
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
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Frontend dependencies installed"
    } else {
        Print-Error "Failed to install frontend dependencies"
        exit 1
    }
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
echo Smart Book Translator
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
echo Application is running!
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
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application, you can:"
Write-Host "  1. Double-click 'Smart Book Translator' on your desktop"
Write-Host "  2. Run: .\run.bat (or .\run.ps1)"
Write-Host ""
Write-Host "Important: This program is for personal use only." -ForegroundColor Yellow
Write-Host "Do not use for commercial purposes or copyright infringement." -ForegroundColor Yellow
Write-Host ""
Write-Host "For more information, see README.md"
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
