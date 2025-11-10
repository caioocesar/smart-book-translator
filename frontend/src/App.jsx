import { useState, useEffect } from 'react';
import './App.css';
import TranslationTab from './components/TranslationTab';
import GlossaryTab from './components/GlossaryTab';
import SettingsTab from './components/SettingsTab';
import HistoryTab from './components/HistoryTab';
import SystemStatus from './components/SystemStatus';
import { t, getCurrentLanguage, setCurrentLanguage, getAvailableLanguages } from './utils/i18n';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [activeTab, setActiveTab] = useState('translation');
  const [settings, setSettings] = useState({});
  const [apiStatus, setApiStatus] = useState(null);
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [hasReadyTranslation, setHasReadyTranslation] = useState(false);
  const [currentLanguage, setLanguage] = useState(getCurrentLanguage());
  const [, forceUpdate] = useState();

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

    // Show privacy notice on first visit
    const hasSeenNotice = localStorage.getItem('hasSeenPrivacyNotice');
    if (!hasSeenNotice) {
      setShowPrivacyNotice(true);
    }

    // Check for ready translations
    checkForReadyTranslations();
  }, []);

  const checkForReadyTranslations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/translation/jobs`);
      const jobs = await response.json();
      const hasCompleted = jobs.some(job => job.status === 'completed' && !job.downloaded);
      setHasReadyTranslation(hasCompleted);
    } catch (err) {
      console.error('Error checking translations:', err);
    }
  };

  const handlePrivacyAccept = () => {
    localStorage.setItem('hasSeenPrivacyNotice', 'true');
    setShowPrivacyNotice(false);
  };

  const handleSettingsUpdate = (newSettings) => {
    setSettings(newSettings);
  };

  const handleLanguageChange = (lang) => {
    setCurrentLanguage(lang);
    setLanguage(lang);
    forceUpdate({}); // Force re-render to update translations
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>📚 {t('appTitle')}</h1>
          <div className="header-actions">
            {/* Language Selector */}
            <select 
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="language-selector"
              title={t('uiLanguage')}
            >
              {getAvailableLanguages().map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>

            <button 
              onClick={() => setShowSystemStatus(!showSystemStatus)}
              className="btn-system-status"
              title={t('systemStatus')}
            >
              🔧 {t('systemStatus')}
            </button>
            <div className={`status-indicator ${apiStatus?.status === 'ok' ? 'online' : 'offline'}`}>
              {apiStatus?.status === 'ok' ? `🟢 ${t('online')}` : `🔴 ${t('offline')}`}
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
            🌐 {t('tabTranslation')}
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 {t('tabHistory')}
            {hasReadyTranslation && <span className="notification-badge">●</span>}
          </button>
          <button
            className={`tab ${activeTab === 'glossary' ? 'active' : ''}`}
            onClick={() => setActiveTab('glossary')}
          >
            📖 {t('tabGlossary')}
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ {t('tabSettings')}
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'translation' && <TranslationTab settings={settings} />}
          {activeTab === 'history' && <HistoryTab settings={settings} onTranslationReady={checkForReadyTranslations} />}
          {activeTab === 'glossary' && <GlossaryTab />}
          {activeTab === 'settings' && <SettingsTab onSettingsUpdate={handleSettingsUpdate} />}
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <p className="copyright-notice">
            ⚠️ <strong>Important:</strong> This program is for personal translation use only. 
            All translations are stored locally on your device. 
            Do not use for commercial purposes or copyright infringement. 
            Respect intellectual property rights and applicable laws.
            <button onClick={() => setShowPrivacyNotice(true)} className="btn-link">
              Learn more
            </button>
          </p>
          <p className="version">v1.0.0 | Made with ❤️ for personal use</p>
        </div>
      </footer>

      {/* Privacy Notice Modal */}
      {showPrivacyNotice && (
        <div className="modal-overlay" onClick={handlePrivacyAccept}>
          <div className="modal-content privacy-modal" onClick={(e) => e.stopPropagation()}>
            <h2>🔒 Privacy & Legal Notice</h2>
            
            <div className="privacy-content">
              <h3>📍 Local Storage & Privacy</h3>
              <ul>
                <li>✅ <strong>All data is stored locally</strong> on your device in an SQLite database</li>
                <li>✅ <strong>No cloud storage</strong> - your documents never leave your computer</li>
                <li>✅ <strong>API keys are encrypted</strong> using AES-256 encryption</li>
                <li>✅ <strong>No tracking or analytics</strong> - complete privacy</li>
                <li>✅ <strong>No internet access</strong> except when calling translation APIs you configure</li>
              </ul>

              <h3>⚖️ Legal & Copyright</h3>
              <ul>
                <li>⚠️ This software is <strong>for personal use only</strong></li>
                <li>⚠️ You are responsible for ensuring you have the right to translate documents</li>
                <li>⚠️ Do not use for commercial purposes without proper licenses</li>
                <li>⚠️ Respect copyright laws and intellectual property rights</li>
                <li>⚠️ Do not translate copyrighted material without permission</li>
                <li>⚠️ Do not circumvent DRM or access controls</li>
              </ul>

              <h3>🔑 API Usage</h3>
              <ul>
                <li>🌐 Translation APIs (DeepL, OpenAI, Google) have their own terms of service</li>
                <li>💰 You are responsible for any API costs incurred</li>
                <li>📊 Monitor your API usage to avoid unexpected charges</li>
                <li>🔐 Keep your API keys secure and never share them</li>
              </ul>

              <div className="privacy-footer">
                <strong>By using this software, you agree to:</strong>
                <ul>
                  <li>Use it responsibly and legally</li>
                  <li>Respect copyright and intellectual property</li>
                  <li>Only translate content you have permission to translate</li>
                  <li>Accept responsibility for your API usage and costs</li>
                </ul>
              </div>
            </div>

            <button onClick={handlePrivacyAccept} className="btn-primary btn-large">
              I Understand & Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
