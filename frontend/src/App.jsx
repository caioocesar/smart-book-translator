import { useState, useEffect } from 'react';
import './App.css';
import TranslationTab from './components/TranslationTab';
import GlossaryTab from './components/GlossaryTab';
import SettingsTab from './components/SettingsTab';
import HistoryTab from './components/HistoryTab';
import SystemStatus from './components/SystemStatus';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [activeTab, setActiveTab] = useState('translation');
  const [settings, setSettings] = useState({});
  const [apiStatus, setApiStatus] = useState(null);
  const [showSystemStatus, setShowSystemStatus] = useState(false);

  useEffect(() => {
    // Test backend connection
    fetch(`${API_URL}/api/health`)
      .then(res => res.json())
      .then(data => {
        setApiStatus(data);
      })
      .catch(err => {
        console.error('Error connecting to backend:', err);
        setApiStatus({ status: 'error', message: 'Backend not connected' });
      });
  }, []);

  const handleSettingsUpdate = (newSettings) => {
    setSettings(newSettings);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>📚 Smart Book Translator</h1>
          <div className="header-actions">
            <button 
              onClick={() => setShowSystemStatus(!showSystemStatus)}
              className="btn-system-status"
              title="System Status & Tests"
            >
              🔧 System Status
            </button>
            <div className={`status-indicator ${apiStatus?.status === 'ok' ? 'online' : 'offline'}`}>
              {apiStatus?.status === 'ok' ? '🟢 Online' : '🔴 Offline'}
            </div>
          </div>
        </div>
        {showSystemStatus && (
          <div className="system-status-panel">
            <SystemStatus />
          </div>
        )}
      </header>

      <div className="tab-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'translation' ? 'active' : ''}`}
            onClick={() => setActiveTab('translation')}
          >
            🌐 Translation
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 History
          </button>
          <button
            className={`tab ${activeTab === 'glossary' ? 'active' : ''}`}
            onClick={() => setActiveTab('glossary')}
          >
            📖 Glossary
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'translation' && <TranslationTab settings={settings} />}
          {activeTab === 'history' && <HistoryTab settings={settings} />}
          {activeTab === 'glossary' && <GlossaryTab />}
          {activeTab === 'settings' && <SettingsTab onSettingsUpdate={handleSettingsUpdate} />}
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <p className="copyright-notice">
            ⚠️ <strong>Important:</strong> This program is for personal translation use only. 
            Do not use for commercial purposes or copyright infringement. 
            Respect intellectual property rights and applicable laws.
          </p>
          <p className="version">v1.0.0 | Made with ❤️ for personal use</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
