import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/global.css'
import App from './App.jsx'
import { ErrorProvider } from './contexts/ErrorContext.jsx'
import setupAxiosInterceptor from './utils/axiosInterceptor.js'

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 2rem; color: red; font-size: 1.5rem;">ERROR: Root element not found!</div>';
} else {
  try {
    const root = createRoot(rootElement);
    
    // Wrapper component to setup axios interceptor with error context
    function AppWithErrorHandling() {
      const errorContextRef = React.useRef(null);
      
      React.useEffect(() => {
        // Setup axios interceptor once we have the error context
        if (errorContextRef.current) {
          setupAxiosInterceptor(errorContextRef.current);
        }
      }, []);
      
      return (
        <ErrorProvider ref={errorContextRef}>
          <App />
        </ErrorProvider>
      );
    }
    
    root.render(
      <StrictMode>
        <ErrorProvider>
          <App />
        </ErrorProvider>
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
