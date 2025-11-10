# Solução: Visual Studio Build Tools - Componente C++ Faltando

## Problema

O erro indica que o Visual Studio Build Tools está instalado, mas está faltando o componente **"Desktop development with C++"** necessário para compilar módulos nativos do Node.js (como `better-sqlite3`).

```
gyp ERR! find VS - found "Visual Studio C++ core features"
gyp ERR! find VS - missing any VC++ toolset
```

## Solução Rápida

Execute o script de instalação que detecta automaticamente o problema:

```powershell
.\install-build-tools.ps1
```

O script irá:
1. Detectar que o Visual Studio Build Tools está instalado
2. Identificar que falta o componente C++
3. Oferecer abrir o Visual Studio Installer automaticamente
4. Fornecer instruções passo a passo

## Solução Manual

### Passo 1: Abrir Visual Studio Installer

1. Procure por "Visual Studio Installer" no menu Iniciar do Windows
2. Abra o aplicativo

### Passo 2: Modificar a Instalação

1. No Visual Studio Installer, localize **"Visual Studio Build Tools 2022"** (ou a versão que você tem)
2. Clique no botão **"Modify"** (Modificar)

### Passo 3: Adicionar Componente C++

1. Na aba **"Workloads"** (Cargas de Trabalho):
   - Procure por **"Desktop development with C++"**
   - Marque a caixa de seleção ✅

2. Clique em **"Modify"** (no canto inferior direito)

3. Aguarde a instalação (pode demorar 10-30 minutos)

### Passo 4: Reiniciar e Reinstalar

1. **FECHE E REABRA o PowerShell** (importante!)
2. Execute:
   ```powershell
   .\fix-python-config.ps1
   .\install-windows.ps1
   ```

## Verificação

Após instalar o componente C++, você pode verificar se está funcionando:

```powershell
# Verificar Python
python --version

# Tentar instalar dependências novamente
cd backend
npm install
```

## Links Úteis

- **Visual Studio Build Tools**: https://aka.ms/vs/17/release/vs_buildtools.exe
- **Visual Studio Downloads**: https://visualstudio.microsoft.com/downloads/
- **Documentação node-gyp**: https://github.com/nodejs/node-gyp#on-windows

## Notas Importantes

- ⚠️ **IMPORTANTE**: Após instalar o componente C++, você DEVE fechar e reabrir o PowerShell para que as mudanças tenham efeito.
- O componente C++ ocupa aproximadamente 3-6 GB de espaço em disco.
- A instalação pode demorar entre 10-30 minutos dependendo da sua conexão e velocidade do disco.

