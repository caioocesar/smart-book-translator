# Script para configurar Python para node-gyp
# Smart Book Translator - Python Configuration Fix

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Configuracao do Python para node-gyp" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Procurar Python instalado
$pythonPaths = @(
    "C:\Python*",
    "$env:LOCALAPPDATA\Programs\Python\Python*",
    "$env:ProgramFiles\Python*",
    "$env:ProgramFiles(x86)\Python*"
)

$foundPython = $null

Write-Host "Procurando Python instalado..." -ForegroundColor Yellow

foreach ($pathPattern in $pythonPaths) {
    $pythonDirs = Get-ChildItem -Path $pathPattern -Directory -ErrorAction SilentlyContinue
    foreach ($dir in $pythonDirs) {
        $pythonExe = Join-Path $dir.FullName "python.exe"
        if (Test-Path $pythonExe) {
            Write-Host "Testando: $pythonExe" -ForegroundColor Gray
            try {
                $version = & $pythonExe --version 2>&1
                if ($version -match "Python \d+\.\d+") {
                    $foundPython = $pythonExe
                    Write-Host "[OK] Python encontrado: $pythonExe" -ForegroundColor Green
                    Write-Host "     Versao: $version" -ForegroundColor Green
                    break
                }
            } catch {
                # Continuar procurando
            }
        }
    }
    if ($foundPython) { break }
}

if (-not $foundPython) {
    Write-Host ""
    Write-Host "[ERRO] Python funcional nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Execute o instalador de Python:" -ForegroundColor Yellow
    Write-Host "  .\install-python-windows.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "OU instale manualmente:" -ForegroundColor Yellow
    Write-Host "  1. Baixe: https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host "  2. Marque 'Add Python to PATH' durante a instalacao" -ForegroundColor Yellow
    Write-Host "  3. Reinicie o PowerShell" -ForegroundColor White
    Write-Host "  4. Execute este script novamente" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Configurando Python para node-gyp..." -ForegroundColor Yellow

# Adicionar Python ao PATH da sessão atual (prioridade)
$pythonDir = Split-Path -Parent $foundPython
$pythonScripts = Join-Path $pythonDir "Scripts"
if ($env:PATH -notlike "*$pythonDir*") {
    $env:PATH = "$pythonDir;$pythonScripts;$env:PATH"
    Write-Host "[OK] Python adicionado ao PATH desta sessao" -ForegroundColor Green
}

# Configurar variável de ambiente PYTHON (usado pelo node-gyp)
# Esta é a forma correta - node-gyp procura PYTHON primeiro
$env:PYTHON = $foundPython
Write-Host "[OK] Variavel de ambiente PYTHON configurada" -ForegroundColor Green
Write-Host "     PYTHON=$foundPython" -ForegroundColor Cyan

# Verificar se python está no PATH agora
try {
    $pythonCheck = python --version 2>&1
    if ($pythonCheck -match "Python") {
        Write-Host "[OK] Python acessivel via PATH: $pythonCheck" -ForegroundColor Green
    }
} catch {
    Write-Host "[INFO] Python nao no PATH, mas variavel PYTHON configurada" -ForegroundColor Yellow
    Write-Host "       node-gyp usara a variavel PYTHON automaticamente" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[OK] Configuracao concluida!" -ForegroundColor Green
Write-Host "Python sera encontrado via PATH ou variavel PYTHON" -ForegroundColor Cyan

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Configuracao concluida!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "  A variavel PYTHON foi configurada para esta sessao." -ForegroundColor White
Write-Host "  Se fechar o PowerShell, execute este script novamente." -ForegroundColor White
Write-Host ""
Write-Host "Agora voce pode executar:" -ForegroundColor Yellow
Write-Host "  .\install-windows.ps1" -ForegroundColor White
Write-Host ""
Write-Host "OU instalar apenas as dependencias do backend:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npm install" -ForegroundColor White
Write-Host ""
Write-Host "Se ainda der erro, tente:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  `$env:PYTHON='$foundPython'; npm install" -ForegroundColor White
Write-Host ""

