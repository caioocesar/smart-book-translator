# Script para instalar Python no Windows
# Smart Book Translator - Python Installer

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Instalador de Python para Windows" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Python já está instalado
Write-Host "Verificando se Python ja esta instalado..." -ForegroundColor Yellow

$pythonFound = $false
$pythonPath = $null

# Tentar encontrar Python funcional
$searchPaths = @(
    "C:\Python*",
    "$env:LOCALAPPDATA\Programs\Python\Python*",
    "$env:ProgramFiles\Python*",
    "$env:ProgramFiles(x86)\Python*"
)

foreach ($pathPattern in $searchPaths) {
    $pythonDirs = Get-ChildItem -Path $pathPattern -Directory -ErrorAction SilentlyContinue
    foreach ($dir in $pythonDirs) {
        $pythonExe = Join-Path $dir.FullName "python.exe"
        if (Test-Path $pythonExe) {
            try {
                $version = & $pythonExe --version 2>&1
                if ($version -match "Python \d+\.\d+") {
                    $pythonFound = $true
                    $pythonPath = $pythonExe
                    Write-Host "[OK] Python encontrado: $pythonExe" -ForegroundColor Green
                    Write-Host "     Versao: $version" -ForegroundColor Green
                    break
                }
            } catch {
                # Continuar procurando
            }
        }
    }
    if ($pythonFound) { break }
}

if ($pythonFound) {
    Write-Host ""
    Write-Host "Python ja esta instalado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configurando npm para usar este Python..." -ForegroundColor Yellow
    npm config set python $pythonPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] npm configurado!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Agora execute:" -ForegroundColor Yellow
        Write-Host "  .\install-windows.ps1" -ForegroundColor White
        exit 0
    }
}

Write-Host ""
Write-Host "Python nao encontrado ou nao funcional." -ForegroundColor Yellow
Write-Host ""

# Tentar instalar via winget
Write-Host "Tentando instalar Python via winget..." -ForegroundColor Yellow

try {
    $wingetVersion = winget --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] winget encontrado" -ForegroundColor Green
        Write-Host ""
        Write-Host "Instalando Python 3.12..." -ForegroundColor Yellow
        Write-Host "Isso pode demorar alguns minutos..." -ForegroundColor Gray
        Write-Host ""
        
        winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[OK] Python instalado com sucesso!" -ForegroundColor Green
            Write-Host ""
            Write-Host "IMPORTANTE:" -ForegroundColor Yellow
            Write-Host "  1. Feche e reabra o PowerShell" -ForegroundColor White
            Write-Host "  2. Execute: .\fix-python-config.ps1" -ForegroundColor White
            Write-Host "  3. Depois execute: .\install-windows.ps1" -ForegroundColor White
            Write-Host ""
            exit 0
        } else {
            Write-Host "[ERRO] Falha ao instalar via winget" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "[INFO] winget nao disponivel" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "Instalacao Manual Necessaria" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Siga estes passos para instalar Python manualmente:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Baixe Python 3.12:" -ForegroundColor White
Write-Host "   https://www.python.org/downloads/" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Execute o instalador .exe baixado" -ForegroundColor White
Write-Host ""
Write-Host "3. IMPORTANTE - Durante a instalacao:" -ForegroundColor Yellow
Write-Host "   - Marque a opcao 'Add Python to PATH' ✅" -ForegroundColor White
Write-Host "   - Clique em 'Install Now'" -ForegroundColor White
Write-Host ""
Write-Host "4. Apos a instalacao:" -ForegroundColor White
Write-Host "   - Feche e reabra o PowerShell" -ForegroundColor White
Write-Host "   - Execute: .\fix-python-config.ps1" -ForegroundColor White
Write-Host "   - Depois execute: .\install-windows.ps1" -ForegroundColor White
Write-Host ""
Write-Host "OU instale via Microsoft Store:" -ForegroundColor Cyan
Write-Host "   - Abra Microsoft Store" -ForegroundColor White
Write-Host "   - Procure por 'Python 3.12'" -ForegroundColor White
Write-Host "   - Clique em 'Instalar'" -ForegroundColor White
Write-Host ""

# Abrir o navegador para download
$openBrowser = Read-Host "Deseja abrir a pagina de download do Python agora? (S/N)"
if ($openBrowser -eq "S" -or $openBrowser -eq "s") {
    Start-Process "https://www.python.org/downloads/"
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")



