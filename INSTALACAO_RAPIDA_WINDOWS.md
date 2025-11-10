# 🚀 Instalação Rápida - Windows

## Problema: Erro ao compilar better-sqlite3

Se você recebeu o erro sobre Python ao instalar, siga estes passos:

## Solução Passo a Passo

### 1️⃣ Instalar Python

1. **Baixe Python:**
   - Acesse: https://www.python.org/downloads/
   - Clique em "Download Python 3.12.x" (ou versão mais recente)

2. **Execute o instalador:**
   - **IMPORTANTE**: Marque a opção **"Add Python to PATH"** ✅
   - Clique em "Install Now"
   - Aguarde a instalação terminar

3. **Verificar instalação:**
   - Feche e reabra o PowerShell
   - Execute:
   ```powershell
   python --version
   ```
   - Deve mostrar algo como: `Python 3.12.x`

### 2️⃣ Instalar Visual Studio Build Tools

1. **Baixe o instalador:**
   - Acesse: https://aka.ms/vs/17/release/vs_buildtools.exe
   - Ou baixe direto: [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)

2. **Execute o instalador:**
   - Marque **"Desktop development with C++"**
   - Clique em "Install"
   - Aguarde (pode demorar 10-20 minutos)

3. **Reinicie o computador** (recomendado)

### 3️⃣ Reinstalar Dependências

1. **Feche e reabra o PowerShell**

2. **Navegue até a pasta do projeto:**
   ```powershell
   cd "C:\Users\caioc\OneDrive\Área de Trabalho\smart-book-translator"
   ```

3. **Execute o instalador:**
   ```powershell
   .\install-windows.ps1
   ```

## ✅ Verificação Final

Após a instalação, verifique:

```powershell
# Verificar Node.js
node -v

# Verificar Python
python --version

# Verificar se as dependências foram instaladas
cd backend
Test-Path "node_modules\better-sqlite3"
```

## 🆘 Ainda com Problemas?

### Opção 1: Script Automatizado
```powershell
.\install-build-tools.ps1
```

### Opção 2: Instalação Manual do Python via PowerShell
```powershell
# Se você tem winget instalado
winget install Python.Python.3.12
```

### Opção 3: Verificar Instalações Existentes

O erro pode indicar que Python está instalado mas não no PATH. Verifique:

```powershell
# Verificar instalações comuns
Test-Path "C:\Users\caioc\AppData\Local\Programs\Python\Python311\python.exe"
Test-Path "C:\Program Files\Python311\python.exe"
```

Se encontrar, adicione ao PATH:
```powershell
$pythonPath = "C:\Users\caioc\AppData\Local\Programs\Python\Python311"
$env:PATH = "$pythonPath;$env:PATH"
python --version
```

## 📝 Notas Importantes

- **Python 3.6+ é obrigatório** para compilar better-sqlite3
- **Visual Studio Build Tools** são necessários para compilar código C++
- **Reinicie o PowerShell** após instalar Python
- **Reinicie o computador** após instalar Build Tools (recomendado)

## 🎯 Próximos Passos

Após resolver o problema de compilação:

1. Execute `.\install-windows.ps1` novamente
2. Aguarde a instalação completa
3. Execute `.\run.bat` para iniciar a aplicação

---

**Precisa de mais ajuda?** Veja `SOLUCAO_PROBLEMAS_WINDOWS.md`

