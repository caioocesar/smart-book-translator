const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

let mainWindow = null;
let tray = null;
let backendProcess = null;
let isQuitting = false;

// Check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Wait for backend to be ready
async function waitForBackend(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const portInUse = !(await checkPort(5000));
    if (portInUse) {
      console.log('✅ Backend is ready!');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`⏳ Waiting for backend... (${i + 1}/${maxAttempts})`);
  }
  return false;
}

// Start backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = path.join(__dirname, '..', 'backend');
    const isWindows = process.platform === 'win32';
    
    console.log('🚀 Starting backend server...');
    
    backendProcess = spawn(
      isWindows ? 'node.exe' : 'node',
      ['server.js'],
      {
        cwd: backendPath,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: '5000',
          ELECTRON_MODE: 'true'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (error) => {
      console.error('❌ Failed to start backend:', error);
      reject(error);
    });

    backendProcess.on('exit', (code) => {
      if (!isQuitting) {
        console.log(`⚠️  Backend exited with code ${code}`);
      }
    });

    // Give it a moment to start
    setTimeout(() => resolve(), 2000);
  });
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // Don't show until ready
  });

  // Load the app
  mainWindow.loadURL('http://localhost:3000');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Window ready!');
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, '..', 'icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Smart Book Translator',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Smart Book Translator');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// App ready
app.whenReady().then(async () => {
  console.log('🚀 Starting Smart Book Translator...');

  try {
    // Start backend
    await startBackend();
    
    // Wait for backend to be ready
    const backendReady = await waitForBackend();
    
    if (!backendReady) {
      console.error('❌ Backend failed to start');
      app.quit();
      return;
    }

    // Create window and tray
    createWindow();
    createTray();

    console.log('✅ Smart Book Translator is ready!');
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    app.quit();
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    app.quit();
  }
});

// Re-create window on macOS
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cleanup on quit
app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // Kill backend process
  if (backendProcess) {
    console.log('🛑 Stopping backend...');
    backendProcess.kill();
  }
});

// Handle single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
