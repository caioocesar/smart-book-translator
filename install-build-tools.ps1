# Script para instalar ferramentas necessárias para compilar better-sqlite3
# Smart Book Translator - Windows Build Tools Installer

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Instalador de Ferramentas de Build" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Visual Studio Build Tools está instalado
Write-Host "Verificando instalacao do Visual Studio Build Tools..." -ForegroundColor Yellow
$vsInstalled = $false
$vsPath = $null
$vsVersion = $null

$vsPaths = @(
    "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools",
    "${env:ProgramFiles}\Microsoft Visual Studio\2022\BuildTools",
    "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\BuildTools",
    "${env:ProgramFiles}\Microsoft Visual Studio\2019\BuildTools"
)

foreach ($path in $vsPaths) {
    if (Test-Path $path) {
        $vsInstalled = $true
        $vsPath = $path
        if ($path -like "*2022*") {
            $vsVersion = "2022"
        } elseif ($path -like "*2019*") {
            $vsVersion = "2019"
        }
        Write-Host "[OK] Visual Studio Build Tools encontrado: $path" -ForegroundColor Green
        break
    }
}

if ($vsInstalled) {
    Write-Host ""
    Write-Host "ATENCAO: Visual Studio Build Tools esta instalado," -ForegroundColor Yellow
    Write-Host "mas esta faltando o componente 'Desktop development with C++'." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Voce precisa adicionar este componente ao Visual Studio existente." -ForegroundColor Cyan
    Write-Host ""
    
    # Tentar encontrar o Visual Studio Installer
    $installerPaths = @(
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vs_installer.exe",
        "${env:ProgramFiles}\Microsoft Visual Studio\Installer\vs_installer.exe"
    )
    
    $installerFound = $false
    foreach ($installerPath in $installerPaths) {
        if (Test-Path $installerPath) {
            $installerFound = $true
            Write-Host "Abrindo Visual Studio Installer..." -ForegroundColor Green
            Write-Host ""
            Write-Host "INSTRUCOES:" -ForegroundColor Yellow
            Write-Host "1. No Visual Studio Installer, clique em 'Modify' (Modificar)" -ForegroundColor White
            Write-Host "2. Marque a opcao 'Desktop development with C++'" -ForegroundColor White
            Write-Host "3. Clique em 'Modify' para instalar" -ForegroundColor White
            Write-Host "4. Aguarde a instalacao (pode demorar alguns minutos)" -ForegroundColor White
            Write-Host "5. Apos instalar, feche e reabra o PowerShell" -ForegroundColor White
            Write-Host "6. Execute: .\install-windows.ps1" -ForegroundColor White
            Write-Host ""
            
            $open = Read-Host "Deseja abrir o Visual Studio Installer agora? (S/N)"
            if ($open -eq "S" -or $open -eq "s") {
                Start-Process $installerPath
                Write-Host ""
                Write-Host "Visual Studio Installer aberto!" -ForegroundColor Green
                Write-Host "Siga as instrucoes acima para adicionar o componente C++." -ForegroundColor Yellow
                Write-Host ""
                exit 0
            }
            break
        }
    }
    
    if (-not $installerFound) {
        Write-Host "[INFO] Visual Studio Installer nao encontrado automaticamente." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Para adicionar o componente C++:" -ForegroundColor Cyan
        Write-Host "1. Abra o Visual Studio Installer manualmente" -ForegroundColor White
        Write-Host "2. Clique em 'Modify' (Modificar)" -ForegroundColor White
        Write-Host "3. Marque 'Desktop development with C++'" -ForegroundColor White
        Write-Host "4. Clique em 'Modify' para instalar" -ForegroundColor White
        Write-Host ""
        Write-Host "OU baixe o instalador:" -ForegroundColor Yellow
        Write-Host "   https://visualstudio.microsoft.com/downloads/" -ForegroundColor Cyan
        Write-Host ""
    }
} else {
    Write-Host "[INFO] Visual Studio Build Tools nao encontrado." -ForegroundColor Yellow
    Write-Host ""
}

# Verificar Python
Write-Host "Verificando Python..." -ForegroundColor Yellow
$pythonFound = $false
$pythonPath = $null

$pythonPaths = @(
    "$env:LOCALAPPDATA\Programs\Python\Python*",
    "$env:ProgramFiles\Python*",
    "C:\Python*"
)

foreach ($pathPattern in $pythonPaths) {
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

if (-not $pythonFound) {
    Write-Host "[INFO] Python nao encontrado." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Resumo da Situacao" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($vsInstalled -and $pythonFound) {
    Write-Host "Status:" -ForegroundColor Yellow
    Write-Host "  [OK] Python instalado" -ForegroundColor Green
    Write-Host "  [!] Visual Studio Build Tools instalado, mas falta componente C++" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ACAO NECESSARIA:" -ForegroundColor Red
    Write-Host "  Adicione 'Desktop development with C++' ao Visual Studio Build Tools" -ForegroundColor White
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Cyan
    Write-Host "  1. Abrir Visual Studio Installer para adicionar componente C++" -ForegroundColor White
    Write-Host "  2. Instrucoes detalhadas" -ForegroundColor White
    Write-Host "  3. Baixar Visual Studio Build Tools completo" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Escolha uma opcao (1-3)"
} elseif (-not $vsInstalled -and $pythonFound) {
    Write-Host "Status:" -ForegroundColor Yellow
    Write-Host "  [OK] Python instalado" -ForegroundColor Green
    Write-Host "  [X] Visual Studio Build Tools nao encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Cyan
    Write-Host "  1. Instalar Visual Studio Build Tools (recomendado)" -ForegroundColor White
    Write-Host "  2. Instrucoes manuais" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Escolha uma opcao (1-2)"
    $choice = if ($choice -eq "1") { "2" } else { "4" }
} elseif ($vsInstalled -and -not $pythonFound) {
    Write-Host "Status:" -ForegroundColor Yellow
    Write-Host "  [X] Python nao encontrado" -ForegroundColor Red
    Write-Host "  [!] Visual Studio Build Tools instalado, mas falta componente C++" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Cyan
    Write-Host "  1. Instalar Python automaticamente (via winget)" -ForegroundColor White
    Write-Host "  2. Abrir Visual Studio Installer para adicionar componente C++" -ForegroundColor White
    Write-Host "  3. Instrucoes manuais completas" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Escolha uma opcao (1-3)"
    if ($choice -eq "2") { $choice = "1" }
    elseif ($choice -eq "3") { $choice = "4" }
} else {
    Write-Host "Status:" -ForegroundColor Yellow
    Write-Host "  [X] Python nao encontrado" -ForegroundColor Red
    Write-Host "  [X] Visual Studio Build Tools nao encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Cyan
    Write-Host "  1. Instalar Python automaticamente (via winget)" -ForegroundColor White
    Write-Host "  2. Instalar Visual Studio Build Tools (recomendado)" -ForegroundColor White
    Write-Host "  3. Instrucoes manuais completas" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Escolha uma opcao (1-3)"
    if ($choice -eq "3") { $choice = "4" }
}

switch ($choice) {
    "1" {
        # Opção 1 pode ser: Abrir VS Installer OU Instalar Python
        if ($vsInstalled -and $pythonFound) {
            # Abrir Visual Studio Installer para adicionar componente C++
            Write-Host ""
            Write-Host "Abrindo Visual Studio Installer..." -ForegroundColor Yellow
            Write-Host ""
            
            $installerPaths = @(
                "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vs_installer.exe",
                "${env:ProgramFiles}\Microsoft Visual Studio\Installer\vs_installer.exe"
            )
            
            $installerFound = $false
            foreach ($installerPath in $installerPaths) {
                if (Test-Path $installerPath) {
                    $installerFound = $true
                    Write-Host "INSTRUCOES IMPORTANTES:" -ForegroundColor Yellow
                    Write-Host "1. No Visual Studio Installer, clique em 'Modify' (Modificar)" -ForegroundColor White
                    Write-Host "2. Na seção 'Workloads', marque 'Desktop development with C++'" -ForegroundColor White
                    Write-Host "3. Clique em 'Modify' (no canto inferior direito) para instalar" -ForegroundColor White
                    Write-Host "4. Aguarde a instalacao (pode demorar 10-30 minutos)" -ForegroundColor White
                    Write-Host "5. Apos instalar, FECHE E REABRA o PowerShell" -ForegroundColor Yellow
                    Write-Host "6. Execute: .\install-windows.ps1" -ForegroundColor White
                    Write-Host ""
                    Write-Host "Abrindo Visual Studio Installer..." -ForegroundColor Green
                    Start-Process $installerPath
                    Write-Host ""
                    Write-Host "[OK] Visual Studio Installer aberto!" -ForegroundColor Green
                    Write-Host "Siga as instrucoes acima para adicionar o componente C++." -ForegroundColor Yellow
                    Write-Host ""
                    exit 0
                }
            }
            
            if (-not $installerFound) {
                Write-Host "[ERRO] Visual Studio Installer nao encontrado." -ForegroundColor Red
                Write-Host ""
                Write-Host "Para adicionar o componente C++ manualmente:" -ForegroundColor Yellow
                Write-Host "1. Abra o Visual Studio Installer manualmente" -ForegroundColor White
                Write-Host "2. Ou baixe: https://visualstudio.microsoft.com/downloads/" -ForegroundColor Cyan
                Write-Host "3. Execute o instalador" -ForegroundColor White
                Write-Host "4. Selecione 'Desktop development with C++'" -ForegroundColor White
                Write-Host ""
            }
        } else {
            # Instalar Python via winget
            Write-Host ""
            Write-Host "Instalando Python via winget..." -ForegroundColor Yellow
            
            # Verificar se winget está disponível
            try {
                winget --version | Out-Null
                Write-Host "Instalando Python 3.12..." -ForegroundColor Green
                winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
                
                Write-Host ""
                Write-Host "[OK] Python instalado!" -ForegroundColor Green
                Write-Host "Por favor, feche e reabra o PowerShell e execute novamente:" -ForegroundColor Yellow
                Write-Host "  .\install-windows.ps1" -ForegroundColor White
            } catch {
                Write-Host "[ERRO] winget nao encontrado. Instale Python manualmente:" -ForegroundColor Red
                Write-Host "  1. Acesse: https://www.python.org/downloads/" -ForegroundColor White
                Write-Host "  2. Baixe Python 3.12 ou superior" -ForegroundColor White
                Write-Host "  3. Durante a instalacao, marque 'Add Python to PATH'" -ForegroundColor White
                Write-Host "  4. Reinicie o PowerShell" -ForegroundColor White
            }
        }
    }
    "2" {
        if ($vsInstalled -and $pythonFound) {
            # Instruções detalhadas para adicionar componente C++
            Write-Host ""
            Write-Host "==========================================" -ForegroundColor Cyan
            Write-Host "Como Adicionar Componente C++" -ForegroundColor Cyan
            Write-Host "==========================================" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "PASSO A PASSO:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "1. Abra o Visual Studio Installer" -ForegroundColor White
            Write-Host "   (Procure 'Visual Studio Installer' no menu Iniciar)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "2. Localize 'Visual Studio Build Tools 2022' na lista" -ForegroundColor White
            Write-Host "   (ou a versao que voce tem instalada)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "3. Clique no botao 'Modify' (Modificar)" -ForegroundColor White
            Write-Host ""
            Write-Host "4. Na aba 'Workloads' (Cargas de Trabalho):" -ForegroundColor White
            Write-Host "   - Procure por 'Desktop development with C++'" -ForegroundColor White
            Write-Host "   - Marque a caixa de selecao" -ForegroundColor White
            Write-Host ""
            Write-Host "5. Clique em 'Modify' (no canto inferior direito)" -ForegroundColor White
            Write-Host ""
            Write-Host "6. Aguarde a instalacao (pode demorar 10-30 minutos)" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "7. Apos a instalacao:" -ForegroundColor White
            Write-Host "   - FECHE E REABRA o PowerShell" -ForegroundColor Yellow
            Write-Host "   - Execute: .\install-windows.ps1" -ForegroundColor White
            Write-Host ""
        } else {
            # Instalar Visual Studio Build Tools completo
            Write-Host ""
            Write-Host "Para instalar Visual Studio Build Tools:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "1. Baixe o Visual Studio Installer:" -ForegroundColor White
            Write-Host "   https://visualstudio.microsoft.com/downloads/" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "2. Execute o instalador" -ForegroundColor White
            Write-Host "3. Selecione 'Desktop development with C++'" -ForegroundColor White
            Write-Host "4. Instale e reinicie o PowerShell" -ForegroundColor White
            Write-Host ""
            Write-Host "OU instale apenas as Build Tools:" -ForegroundColor Yellow
            Write-Host "   https://aka.ms/vs/17/release/vs_buildtools.exe" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Apos instalar, execute novamente:" -ForegroundColor Yellow
            Write-Host "  .\install-windows.ps1" -ForegroundColor White
        }
    }
    "3" {
        if ($vsInstalled -and $pythonFound) {
            # Baixar Visual Studio Build Tools completo
            Write-Host ""
            Write-Host "Baixando Visual Studio Build Tools..." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Se voce preferir instalar o Visual Studio Build Tools completo:" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "1. Baixe o instalador:" -ForegroundColor White
            Write-Host "   https://aka.ms/vs/17/release/vs_buildtools.exe" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "2. Execute o instalador" -ForegroundColor White
            Write-Host "3. Selecione 'Desktop development with C++'" -ForegroundColor White
            Write-Host "4. Instale e reinicie o PowerShell" -ForegroundColor White
            Write-Host ""
            
            $open = Read-Host "Deseja abrir a pagina de download? (S/N)"
            if ($open -eq "S" -or $open -eq "s") {
                Start-Process "https://aka.ms/vs/17/release/vs_buildtools.exe"
                Write-Host ""
                Write-Host "Pagina de download aberta!" -ForegroundColor Green
            }
        } else {
            # Usar alternativa sem compilação
            Write-Host ""
            Write-Host "Usando alternativa sem compilacao..." -ForegroundColor Yellow
            Write-Host "Isso substituira better-sqlite3 por sql.js (mais lento, mas nao precisa compilar)" -ForegroundColor Yellow
            Write-Host ""
            
            $confirm = Read-Host "Continuar? (S/N)"
            if ($confirm -eq "S" -or $confirm -eq "s") {
                Write-Host "Atualizando package.json..." -ForegroundColor Green
                
                # Ler package.json
                $packageJson = Get-Content "backend\package.json" -Raw | ConvertFrom-Json
                
                # Remover better-sqlite3 e adicionar sql.js
                $packageJson.dependencies.PSObject.Properties.Remove('better-sqlite3')
                $packageJson.dependencies | Add-Member -MemberType NoteProperty -Name "sql.js" -Value "^1.10.3" -Force
                
                # Salvar
                $packageJson | ConvertTo-Json -Depth 10 | Set-Content "backend\package.json" -Encoding UTF8
                
                Write-Host "[OK] package.json atualizado" -ForegroundColor Green
                Write-Host ""
                Write-Host "NOTA: Voce precisara atualizar o codigo do backend para usar sql.js" -ForegroundColor Yellow
                Write-Host "Isso requer modificacoes no codigo. Recomendamos instalar as ferramentas de build." -ForegroundColor Yellow
            }
        }
    }
    "4" {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "Instrucoes Manuais Completas" -ForegroundColor Cyan
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host ""
        
        if ($vsInstalled) {
            Write-Host "1. ADICIONAR COMPONENTE C++ AO VISUAL STUDIO BUILD TOOLS:" -ForegroundColor Yellow
            Write-Host "   - Abra o Visual Studio Installer" -ForegroundColor White
            Write-Host "   - Localize 'Visual Studio Build Tools 2022' (ou sua versao)" -ForegroundColor White
            Write-Host "   - Clique em 'Modify' (Modificar)" -ForegroundColor White
            Write-Host "   - Na aba 'Workloads', marque 'Desktop development with C++'" -ForegroundColor White
            Write-Host "   - Clique em 'Modify' para instalar (pode demorar 10-30 minutos)" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "1. INSTALAR VISUAL STUDIO BUILD TOOLS:" -ForegroundColor Yellow
            Write-Host "   - Baixe: https://aka.ms/vs/17/release/vs_buildtools.exe" -ForegroundColor White
            Write-Host "   - Execute o instalador" -ForegroundColor White
            Write-Host "   - Selecione 'Desktop development with C++'" -ForegroundColor White
            Write-Host "   - Instale (pode demorar 10-30 minutos)" -ForegroundColor White
            Write-Host ""
        }
        
        if (-not $pythonFound) {
            Write-Host "2. INSTALAR PYTHON:" -ForegroundColor Yellow
            Write-Host "   - Acesse: https://www.python.org/downloads/" -ForegroundColor White
            Write-Host "   - Baixe Python 3.12 ou superior" -ForegroundColor White
            Write-Host "   - IMPORTANTE: Marque 'Add Python to PATH' durante a instalacao" -ForegroundColor White
            Write-Host "   - Reinicie o PowerShell apos instalar" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "2. PYTHON:" -ForegroundColor Yellow
            Write-Host "   [OK] Python ja esta instalado: $pythonPath" -ForegroundColor Green
            Write-Host ""
        }
        
        Write-Host "3. VERIFICAR INSTALACAO:" -ForegroundColor Yellow
        if (-not $pythonFound) {
            Write-Host "   python --version  (deve mostrar Python 3.x)" -ForegroundColor White
        } else {
            Write-Host "   python --version  (deve mostrar Python 3.x)" -ForegroundColor White
            Write-Host "   [OK] Python encontrado: $pythonPath" -ForegroundColor Green
        }
        Write-Host ""
        
        Write-Host "4. APOS INSTALAR TUDO:" -ForegroundColor Yellow
        Write-Host "   - FECHE E REABRA o PowerShell" -ForegroundColor White
        Write-Host "   - Execute: .\fix-python-config.ps1" -ForegroundColor White
        Write-Host "   - Execute: .\install-windows.ps1" -ForegroundColor White
        Write-Host ""
    }
    default {
        Write-Host "Opcao invalida!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

