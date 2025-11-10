import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/global.css'
import App from './App.jsx'

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 2rem; color: red; font-size: 1.5rem;">ERROR: Root element not found!</div>';
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('✅ React app mounted successfully');
  } catch (error) {
    console.error('❌ Error mounting React app:', error);
    rootElement.innerHTML = `
      <div style="padding: 2rem; color: red; font-size: 1.2rem;">
        <h1>Error Loading Application</h1>
        <p>${error.message}</p>
        <pre style="background: #f0f0f0; padding: 1rem; border-radius: 4px; overflow: auto;">${error.stack}</pre>
      </div>
    `;
  }
}
