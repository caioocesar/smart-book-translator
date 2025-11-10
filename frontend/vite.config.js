import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Try to read backend port from file
let backendPort = 5000;
try {
  const portInfoPath = path.resolve(__dirname, '../.port-info.json');
  if (fs.existsSync(portInfoPath)) {
    const portInfo = JSON.parse(fs.readFileSync(portInfoPath, 'utf-8'));
    backendPort = portInfo.backendPort || 5000;
    console.log(`📝 Using backend port from config: ${backendPort}`);
  }
} catch (err) {
  console.log('📝 Using default backend port: 5000');
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
      '/socket.io': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
