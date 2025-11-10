# ✅ Python Instalado - Próximos Passos

## 🎉 Python 3.12 foi instalado com sucesso!

Agora você precisa seguir estes passos:

### 1️⃣ **FECHAR E REABRIR O POWERSHELL**

**IMPORTANTE**: O Python foi instalado, mas o PowerShell atual não reconhece ainda. Você **DEVE** fechar e reabrir o PowerShell para que o PATH seja atualizado.

### 2️⃣ **Verificar Instalação**

Após reabrir o PowerShell, execute:

```powershell
python --version
```

Deve mostrar: `Python 3.12.10` ou similar.

### 3️⃣ **Configurar npm para usar Python**

Execute:

```powershell
.\fix-python-config.ps1
```

Este script irá:
- Encontrar o Python instalado
- Configurar o npm para usar esse Python
- Verificar se está tudo funcionando

### 4️⃣ **Instalar Dependências**

Após configurar o Python, execute:

```powershell
.\install-windows.ps1
```

OU apenas as dependências do backend:

```powershell
cd backend
npm install
```

## 🔧 Se Python ainda não funcionar após reiniciar

### Opção 1: Adicionar Python ao PATH manualmente

1. Encontre onde o Python foi instalado:
```powershell
Get-ChildItem "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\" -Recurse -Filter "python.exe" | Select-Object FullName
```

2. Adicione ao PATH (substitua pelo caminho encontrado):
```powershell
$pythonDir = "C:\Users\caioc\AppData\Local\Programs\Python\Python312"
$env:PATH = "$pythonDir;$pythonDir\Scripts;$env:PATH"
python --version
```

### Opção 2: Reinstalar Python com PATH

1. Baixe Python: https://www.python.org/downloads/
2. Execute o instalador
3. **IMPORTANTE**: Marque "Add Python to PATH" ✅
4. Reinicie o PowerShell

## ✅ Verificação Final

Após seguir os passos acima, verifique:

```powershell
# Verificar Python
python --version

# Verificar npm config
npm config get python

# Tentar instalar dependências
cd backend
npm install
```

## 🆘 Ainda com Problemas?

Se ainda tiver problemas:

1. **Verifique se Visual Studio Build Tools está instalado:**
   - Baixe: https://aka.ms/vs/17/release/vs_buildtools.exe
   - Marque "Desktop development with C++"
   - Instale e reinicie o computador

2. **Veja a documentação completa:**
   - `INSTALACAO_RAPIDA_WINDOWS.md`
   - `SOLUCAO_PROBLEMAS_WINDOWS.md`

---

**Lembre-se**: Sempre feche e reabra o PowerShell após instalar Python!

