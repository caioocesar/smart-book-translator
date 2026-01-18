import { useState, useEffect } from 'react';
import './App.css';
import TranslationTab from './components/TranslationTab';
import GlossaryTab from './components/GlossaryTab';
import SettingsTab from './components/SettingsTab';
import HistoryTab from './components/HistoryTab';
import SystemStatus from './components/SystemStatus';
import ErrorModal from './components/ErrorModal';
import LocalStatusModal from './components/LocalStatusModal';
import { ErrorProvider, useError } from './contexts/ErrorContext';
import setupAxiosInterceptor from './utils/axiosInterceptor';
import { t, getCurrentLanguage, setCurrentLanguage, getAvailableLanguages } from './utils/i18n';

// Use relative URL to leverage Vite proxy in development
const API_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [activeTab, setActiveTab] = useState('translation');
  const [settings, setSettings] = useState({});
  const [apiStatus, setApiStatus] = useState(null);
  const [libreTranslateStatus, setLibreTranslateStatus] = useState(null);
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [showLocalStatusModal, setShowLocalStatusModal] = useState(false);
  const [hasReadyTranslation, setHasReadyTranslation] = useState(false);
  const [currentLanguage, setLanguage] = useState(getCurrentLanguage());
  const [showOllamaPrompt, setShowOllamaPrompt] = useState(false);
  const [, forceUpdate] = useState();

  useEffect(() => {
    // Load settings on app start
    const loadSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    
    loadSettings();
    
    // Test backend connection
    fetch(`${API_URL}/api/health`)
      .then(res => {
        if (!res.ok) throw new Error('Backend not responding');
        return res.json();
      })
      .then(data => {
        setApiStatus(data);
      })
      .catch(err => {
        console.error('Error connecting to backend:', err);
        setApiStatus({ status: 'error', message: 'Backend not connected' });
      });

    // Check LibreTranslate status
    checkLibreTranslateStatus();

    // Show privacy notice on first visit
    const hasSeenNotice = localStorage.getItem('hasSeenPrivacyNotice');
    if (!hasSeenNotice) {
      setShowPrivacyNotice(true);
    }

    // Check for ready translations
    checkForReadyTranslations();

    // Check Ollama installation status
    checkOllamaInstallation();

    // Poll LibreTranslate status more frequently during startup (every 5s for first minute)
    let pollCount = 0;
    const quickPollInterval = setInterval(() => {
      checkLibreTranslateStatus();
      pollCount++;
      if (pollCount >= 12) { // Stop after 60 seconds (12 * 5s)
        clearInterval(quickPollInterval);
      }
    }, 5000); // Every 5s (reduced from 2s)

    // Frontend fallback: If LibreTranslate is still stopped after 30 seconds, try to start it
    const fallbackTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/api/local-translation/status`);
        if (response.ok) {
          const data = await response.json();
          if (!data.running && data.dockerAvailable && data.dockerRunning) {
            console.log('🔄 Frontend fallback: Attempting to start LibreTranslate...');
            try {
              const startResponse = await fetch(`${API_URL}/api/local-translation/start`, {
                method: 'POST'
              });
              const startResult = await startResponse.json();
              if (startResult.success) {
                console.log('✅ Frontend fallback: LibreTranslate started successfully');
              } else {
                console.log('⚠️ Frontend fallback: Failed to start LibreTranslate:', startResult.message);
              }
            } catch (startError) {
              console.error('Frontend fallback start error:', startError);
            }
          }
        }
      } catch (error) {
        console.error('Frontend fallback check error:', error);
      }
    }, 30000); // 30 seconds

    // Regular polling after startup period
    const libreTranslateInterval = setInterval(checkLibreTranslateStatus, 30000); // Every 30s (reduced from 10s)
    
    return () => {
      clearInterval(quickPollInterval);
      clearInterval(libreTranslateInterval);
      clearTimeout(fallbackTimeout);
    };
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

  const checkOllamaInstallation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ollama/status`);
      if (response.ok) {
        const data = await response.json();
        
        // Only show prompt if Ollama is not installed and user hasn't dismissed it before
        const hasSeenOllamaPrompt = localStorage.getItem('hasSeenOllamaPrompt');
        if (!data.installed && !hasSeenOllamaPrompt) {
          // Wait 5 seconds before showing prompt (don't interrupt startup)
          setTimeout(() => {
            setShowOllamaPrompt(true);
          }, 5000);
        }
      }
    } catch (err) {
      console.error('Error checking Ollama status:', err);
    }
  };

  const handleOllamaPromptClose = (dontShowAgain = false) => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenOllamaPrompt', 'true');
    }
    setShowOllamaPrompt(false);
  };

  const checkLibreTranslateStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/local-translation/status`);
      if (response.ok) {
        const data = await response.json();
        setLibreTranslateStatus(data);
      }
    } catch (err) {
      console.error('Error checking LibreTranslate status:', err);
      setLibreTranslateStatus({ running: false, error: err.message });
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

  // Add a simple test to verify React is rendering
  console.log('App component rendering...', { activeTab, settings, apiStatus });

  return (
    <div className="app">
      <ErrorModal />
      <header className="app-header">
        <div className="header-content">
          <h1>📚 Smart Book Translator</h1>
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
            
            {/* LibreTranslate Status */}
            <div 
              className={`status-indicator ${libreTranslateStatus?.running ? 'online' : 'offline'}`}
              title={libreTranslateStatus?.running ? `LibreTranslate: Running (${libreTranslateStatus?.languageCount || 0} languages)` : 'LibreTranslate: Stopped'}
              style={{ cursor: 'pointer' }}
              onClick={() => setShowLocalStatusModal(true)}
            >
              {libreTranslateStatus?.running ? '🏠 Local' : '🏠 ⚠️'}
            </div>

            {/* Backend Status */}
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

      {/* Local Status Modal */}
      <LocalStatusModal 
        isOpen={showLocalStatusModal} 
        onClose={() => setShowLocalStatusModal(false)} 
      />

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

      {/* Ollama Installation Prompt */}
      {showOllamaPrompt && (
        <div className="modal-overlay" onClick={() => handleOllamaPromptClose(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>🤖 Enhance Your Translations with AI</h2>
            
            <div style={{ padding: '20px 0' }}>
              <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '20px' }}>
                <strong>Ollama</strong> is a free, offline AI tool that can improve your translations by:
              </p>
              
              <ul style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '20px', marginBottom: '20px' }}>
                <li>✨ Adjusting formality (formal/informal/neutral)</li>
                <li>📝 Improving text structure and coherence</li>
                <li>🔍 Verifying glossary terms</li>
                <li>🎯 Making translations more natural</li>
              </ul>

              <div style={{ background: '#f0f7ff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  <strong>💡 Optional but Recommended:</strong><br/>
                  Ollama runs completely offline on your computer. No internet required after installation.
                </p>
              </div>

              <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                Installation takes about 2-3 minutes. You'll need to restart your computer after installation.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => handleOllamaPromptClose(true)} 
                className="btn-secondary"
                style={{ padding: '10px 20px' }}
              >
                Don't Show Again
              </button>
              <button 
                onClick={() => {
                  handleOllamaPromptClose(false);
                  window.open('https://ollama.com/download', '_blank');
                }} 
                className="btn-primary"
                style={{ padding: '10px 20px' }}
              >
                📥 Download Ollama
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#999', marginTop: '15px', textAlign: 'center' }}>
              You can also install later from Settings → LLM Enhancement
            </p>
          </div>
        </div>
      )}

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
