# 🔧 Solução de Problemas - Windows

## Problema: Node.js instalado mas não funciona

### Sintomas
- Você instalou o Node.js mas ao executar `node -v` recebe erro:
  ```
  'node' não é reconhecido como comando...
  ```

### Solução Rápida

**Opção 1: Executar script de correção automática**
```powershell
.\fix-node-path.ps1
```

**Opção 2: Executar instalação (agora corrige automaticamente)**
```powershell
.\install-windows.ps1
```

**Opção 3: Adicionar manualmente ao PATH (Permanente)**

1. Abra o PowerShell **como Administrador**
2. Execute:
```powershell
$nodePath = "C:\Program Files\nodejs"
[System.Environment]::SetEnvironmentVariable(
    'Path',
    [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ";$nodePath",
    'Machine'
)
```

3. Feche e reabra o PowerShell

**Opção 4: Reiniciar o computador**
- Após instalar o Node.js, às vezes é necessário reiniciar para o PATH ser atualizado

### Verificar se funcionou

```powershell
node -v
npm -v
```

Se ambos mostrarem versões, está funcionando! ✅

## Problema: Erro ao executar scripts PowerShell

### Sintoma
```
... não pode ser carregado porque a execução de scripts está desabilitada...
```

### Solução

Execute no PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Problema: Erro ao compilar better-sqlite3

### Sintoma
```
gyp ERR! find Python
gyp ERR! find Python Python is not set from command line
npm error gyp ERR! configure error
```

### Solução

O `better-sqlite3` precisa compilar código nativo e requer:

1. **Python 3.6 ou superior**
   - Baixe: https://www.python.org/downloads/
   - **IMPORTANTE**: Marque "Add Python to PATH" durante a instalação
   - Reinicie o PowerShell após instalar

2. **Visual Studio Build Tools**
   - Baixe: https://aka.ms/vs/17/release/vs_buildtools.exe
   - Execute o instalador
   - Selecione "Desktop development with C++"
   - Instale (pode demorar alguns minutos)

3. **Verificar instalação:**
```powershell
python --version
```

4. **Reinstalar dependências:**
```powershell
.\install-windows.ps1
```

**OU use o script automatizado:**
```powershell
.\install-build-tools.ps1
```

## Problema: Dependências não instaladas

### Sintoma
- Erro ao executar `npm install`
- Pasta `node_modules` não existe

### Solução

1. Certifique-se que Node.js está funcionando (veja acima)
2. Se o erro for sobre Python/Build Tools, veja seção acima
3. Execute o instalador:
```powershell
.\install-windows.ps1
```

Ou manualmente:
```powershell
cd backend
npm install
cd ../frontend
npm install
```

## Problema: Porta já em uso

### Sintoma
```
Error: listen EADDRINUSE: address already in use :::5000
```

### Solução

1. Encontrar processo usando a porta:
```powershell
netstat -ano | findstr :5000
```

2. Encerrar processo (substitua PID pelo número encontrado):
```powershell
taskkill /PID <PID> /F
```

Ou simplesmente reinicie o computador.

## Problema: Aplicação não inicia

### Verificações

1. ✅ Node.js instalado e funcionando
2. ✅ Dependências instaladas (pasta `node_modules` existe)
3. ✅ Arquivo `.env` existe em `backend/`
4. ✅ Portas 5000 e 5173 não estão em uso

### Logs de erro

Verifique as janelas do terminal que abrem ao executar `run.bat`:
- **Backend**: Deve mostrar "Server running on port 5000"
- **Frontend**: Deve mostrar "Local: http://localhost:5173"

## Contato e Suporte

Se nenhuma solução funcionar:
1. Verifique a versão do Node.js: `node -v` (deve ser 18 ou superior)
2. Verifique se está na pasta correta do projeto
3. Tente executar manualmente:
   ```powershell
   cd backend
   npm start
   ```
   (Em outro terminal)
   ```powershell
   cd frontend
   npm run dev
   ```

