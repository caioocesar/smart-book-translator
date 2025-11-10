import { useState, useEffect } from 'react';
import axios from 'axios';
import { t } from '../utils/i18n.js';

const API_URL = import.meta.env.VITE_API_URL || '';

function SettingsTab({ onSettingsUpdate }) {
  const [settings, setSettings] = useState({
    deepl_api_key: '',
    openai_api_key: '',
    openai_model: 'gpt-3.5-turbo',
    outputDirectory: '',
    chunkSize: 3000,
    autoRetryFailed: true,
    autoResumePending: true
  });
  const [testResults, setTestResults] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o']);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings`);
      setSettings({ ...settings, ...response.data });
      if (onSettingsUpdate) {
        onSettingsUpdate(response.data);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Save each setting
      for (const [key, value] of Object.entries(settings)) {
        if (value) {
          await axios.post(`${API_URL}/api/settings`, { key, value });
        }
      }
      
      setSuccess('Settings saved successfully');
      if (onSettingsUpdate) {
        onSettingsUpdate(settings);
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailableModels = async (apiKey) => {
    if (!apiKey) return;
    
    try {
      const response = await axios.post(`${API_URL}/api/settings/check-models`, {
        apiKey
      });
      if (response.data.available && response.data.available.length > 0) {
        setAvailableModels(response.data.available);
        // If current model is not available, switch to first available
        if (!response.data.available.includes(settings.openai_model)) {
          setSettings({ ...settings, openai_model: response.data.available[0] });
        }
      }
    } catch (err) {
      console.error('Could not check available models:', err);
      // Keep default models on error
    }
  };

  const handleTestApi = async (provider) => {
    setError('');
    const apiKey = settings[`${provider}_api_key`];
    
    if (!apiKey) {
      setError(`Please enter ${provider} API key first`);
      return;
    }

    setTestResults({ ...testResults, [provider]: 'testing' });

    try {
      const options = provider === 'openai' 
        ? { model: settings.openai_model }
        : {};

      const response = await axios.post(`${API_URL}/api/settings/test-api`, {
        provider,
        apiKey,
        options
      });

      // If OpenAI test succeeds, check available models
      if (provider === 'openai' && response.data.success) {
        await checkAvailableModels(apiKey);
      }

      setTestResults({ 
        ...testResults, 
        [provider]: {
          success: true,
          message: response.data.message,
          testTranslation: response.data.testTranslation
        }
      });
    } catch (err) {
      setTestResults({ 
        ...testResults, 
        [provider]: {
          success: false,
          message: err.response?.data?.error || 'Test failed'
        }
      });
    }
  };

  const handleSelectDirectory = () => {
    // In a real desktop app, this would open a native directory picker
    // For web version, we'll use a simple input
    const dir = prompt('Enter output directory path:', settings.outputDirectory);
    if (dir !== null) {
      setSettings({ ...settings, outputDirectory: dir });
    }
  };

  // Get recommended chunk size based on configured API
  const getRecommendedChunkSize = () => {
    if (settings.deepl_api_key) {
      // DeepL Free: 500k chars/month, recommend smaller chunks to avoid limits
      // DeepL Pro: Can handle larger chunks
      // Default recommendation: 3000-5000 for free, 5000-8000 for pro
      return { min: 3000, max: 5000, recommended: 4000, note: 'DeepL Free: 500k chars/month limit' };
    } else if (settings.openai_api_key) {
      // OpenAI: Based on model context window
      const model = settings.openai_model || 'gpt-3.5-turbo';
      if (model.includes('gpt-4o') || model.includes('gpt-4-turbo')) {
        return { min: 5000, max: 10000, recommended: 8000, note: 'GPT-4o/Turbo: 128K context window' };
      } else if (model.includes('gpt-4')) {
        return { min: 3000, max: 8000, recommended: 5000, note: 'GPT-4: 8K context window' };
      } else {
        return { min: 3000, max: 6000, recommended: 4000, note: 'GPT-3.5: 16K context window' };
      }
    } else {
      // Google Translate: Free, recommend smaller chunks to avoid rate limits
      return { min: 2000, max: 4000, recommended: 3000, note: 'Google Translate: Free tier, smaller chunks recommended' };
    }
  };

  const chunkRecommendation = getRecommendedChunkSize();

  return (
    <div className="settings-tab">
      <h2>{t('tabSettings')}</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="settings-section">
        <h3>General Settings</h3>
        <div className="form-group">
          <label>Output Directory</label>
          <div className="input-with-button">
            <input
              type="text"
              value={settings.outputDirectory}
              onChange={(e) => setSettings({...settings, outputDirectory: e.target.value})}
              placeholder="Default: ./outputs"
            />
            <button onClick={handleSelectDirectory} className="btn-secondary">
              📁 Browse
            </button>
          </div>
          <p className="help-text">Location where translated documents will be saved</p>
        </div>

        <div className="form-group">
          <label>Chunk Size (characters)</label>
          <input
            type="number"
            value={settings.chunkSize}
            onChange={(e) => setSettings({...settings, chunkSize: parseInt(e.target.value)})}
            min={chunkRecommendation.min}
            max={chunkRecommendation.max}
          />
          <p className="help-text">
            <strong>Recommended: {chunkRecommendation.recommended} characters</strong> ({chunkRecommendation.note})
            <br />
            Range: {chunkRecommendation.min} - {chunkRecommendation.max} characters
            <br />
            Larger chunks = fewer API calls but may hit limits. Adjust based on your API plan.
          </p>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.autoRetryFailed !== false}
              onChange={(e) => setSettings({...settings, autoRetryFailed: e.target.checked})}
            />
            <span>🔄 Auto-Retry Failed Chunks</span>
          </label>
          <p className="help-text">
            Automatically retry failed chunks when their scheduled retry time arrives (default: enabled)
          </p>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.autoResumePending !== false}
              onChange={(e) => setSettings({...settings, autoResumePending: e.target.checked})}
            />
            <span>▶️ Auto-Resume Pending Translations</span>
          </label>
          <p className="help-text">
            Automatically resume pending translations when opening the application (default: enabled)
          </p>
        </div>
      </div>

      <div className="settings-section">
        <h3>DeepL API Configuration</h3>
        <div className="form-group">
          <label>API Key</label>
          <div className="input-with-test">
            <input
              type="password"
              value={settings.deepl_api_key}
              onChange={(e) => setSettings({...settings, deepl_api_key: e.target.value})}
              placeholder="Enter DeepL API key"
            />
            <button 
              onClick={() => handleTestApi('deepl')} 
              className="btn-secondary"
              disabled={!settings.deepl_api_key}
            >
              Test
            </button>
          </div>
          {testResults.deepl && (
            <div className={`test-result ${testResults.deepl.success ? 'success' : 'error'}`}>
              {testResults.deepl === 'testing' ? 'Testing...' : testResults.deepl.message}
              {testResults.deepl.testTranslation && (
                <p>Test translation: "{testResults.deepl.testTranslation}"</p>
              )}
            </div>
          )}
        </div>
        <div className="api-info">
          <p>Get your API key at: <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer">deepl.com/pro-api</a></p>
        </div>
      </div>

      <div className="settings-section">
        <h3>OpenAI API Configuration</h3>
        <div className="form-group">
          <label>API Key</label>
          <div className="input-with-test">
            <input
              type="password"
              value={settings.openai_api_key}
              onChange={(e) => setSettings({...settings, openai_api_key: e.target.value})}
              placeholder="Enter OpenAI API key"
            />
            <button 
              onClick={() => handleTestApi('openai')} 
              className="btn-secondary"
              disabled={!settings.openai_api_key}
            >
              Test
            </button>
          </div>
          {testResults.openai && (
            <div className={`test-result ${testResults.openai.success ? 'success' : 'error'}`}>
              {testResults.openai === 'testing' ? 'Testing...' : testResults.openai.message}
              {testResults.openai.testTranslation && (
                <p>Test translation: "{testResults.openai.testTranslation}"</p>
              )}
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Model</label>
          <select
            value={settings.openai_model}
            onChange={(e) => setSettings({...settings, openai_model: e.target.value})}
          >
            {availableModels.includes('gpt-3.5-turbo') && (
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, Cheaper)</option>
            )}
            {availableModels.includes('gpt-4') && (
              <option value="gpt-4">GPT-4 (Better Quality, More Expensive)</option>
            )}
            {availableModels.includes('gpt-4-turbo') && (
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            )}
            {availableModels.includes('gpt-4o') && (
              <option value="gpt-4o">GPT-4o (Latest, Recommended)</option>
            )}
            {availableModels.length === 0 && (
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Default)</option>
            )}
          </select>
          {availableModels.length < 4 && (
            <p className="help-text" style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.5rem' }}>
              Only showing models you have access to. Test your API key to detect available models.
            </p>
          )}
        </div>
        <div className="api-info">
          <p>Get your API key at: <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">platform.openai.com</a></p>
        </div>
      </div>

      <div className="settings-actions">
        <button 
          onClick={handleSave} 
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>

      <div className="settings-info">
        <h4>💡 Tips</h4>
        <ul>
          <li>Save your API keys here for quick access during translation</li>
          <li>Test your API keys before starting large translation jobs</li>
          <li>API keys are stored locally in the database</li>
          <li>DeepL typically offers better quality for European languages</li>
          <li>OpenAI GPT-4 provides excellent context-aware translation</li>
        </ul>
      </div>
    </div>
  );
}

export default SettingsTab;


