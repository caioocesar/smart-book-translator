# Script para corrigir o PATH do Node.js no Windows
# Este script adiciona o Node.js ao PATH da sessão atual

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Corrigindo PATH do Node.js" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$nodePath = "C:\Program Files\nodejs"

if (Test-Path "$nodePath\node.exe") {
    Write-Host "[OK] Node.js encontrado em: $nodePath" -ForegroundColor Green
    
    # Adicionar ao PATH da sessão atual
    $env:PATH = "$nodePath;$env:PATH"
    
    Write-Host "[OK] Node.js adicionado ao PATH desta sessão" -ForegroundColor Green
    Write-Host ""
    
    # Verificar se funciona
    $nodeVersion = & "$nodePath\node.exe" -v
    $npmVersion = & "$nodePath\npm.cmd" -v
    
    Write-Host "Node.js versao: $nodeVersion" -ForegroundColor Cyan
    Write-Host "npm versao: $npmVersion" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Node.js configurado com sucesso!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANTE: Esta correcao e temporaria para esta sessao." -ForegroundColor Yellow
    Write-Host "Para tornar permanente, execute como Administrador:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [System.Environment]::SetEnvironmentVariable(" -ForegroundColor White
    Write-Host "    'Path'," -ForegroundColor White
    Write-Host "    [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';$nodePath'," -ForegroundColor White
    Write-Host "    'Machine'" -ForegroundColor White
    Write-Host "  )" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou reinicie o PowerShell/Terminal apos instalar o Node.js." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Agora voce pode executar:" -ForegroundColor Green
    Write-Host "  .\install-windows.ps1" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host "[ERRO] Node.js nao encontrado em: $nodePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale o Node.js:" -ForegroundColor Yellow
    Write-Host "  1. Acesse: https://nodejs.org/" -ForegroundColor White
    Write-Host "  2. Baixe a versao LTS (18 ou superior)" -ForegroundColor White
    Write-Host "  3. Execute o instalador .msi" -ForegroundColor White
    Write-Host "  4. Certifique-se de marcar 'Add to PATH' durante a instalacao" -ForegroundColor White
    Write-Host "  5. Reinicie o PowerShell" -ForegroundColor White
    Write-Host ""
    exit 1
}

