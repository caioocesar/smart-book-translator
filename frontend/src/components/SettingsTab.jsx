import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function SettingsTab({ onSettingsUpdate }) {
  const [settings, setSettings] = useState({
    deepl_api_key: '',
    openai_api_key: '',
    openai_model: 'gpt-3.5-turbo',
    outputDirectory: '',
    chunkSize: 3000
  });
  const [testResults, setTestResults] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="settings-tab">
      <h2>Settings</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

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
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, Cheaper)</option>
            <option value="gpt-4">GPT-4 (Better Quality, More Expensive)</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
        </div>
        <div className="api-info">
          <p>Get your API key at: <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">platform.openai.com</a></p>
        </div>
      </div>

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
            min="500"
            max="10000"
          />
          <p className="help-text">
            Larger chunks = fewer API calls but may hit limits. Recommended: 3000-5000
          </p>
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


