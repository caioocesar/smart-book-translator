import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

function GlossaryTab() {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    sourceTerm: '',
    targetTerm: '',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    category: ''
  });
  const [filterSource, setFilterSource] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' }
  ];

  useEffect(() => {
    loadEntries();
  }, [filterSource, filterTarget]);

  const loadEntries = async () => {
    try {
      const params = {};
      if (filterSource) params.sourceLanguage = filterSource;
      if (filterTarget) params.targetLanguage = filterTarget;

      const response = await axios.get(`${API_URL}/api/glossary`, { params });
      setEntries(response.data);
    } catch (err) {
      console.error('Error loading glossary:', err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newEntry.sourceTerm || !newEntry.targetTerm) {
      setError('Source and target terms are required');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/glossary`, newEntry);
      setSuccess('Entry added successfully');
      setNewEntry({
        sourceTerm: '',
        targetTerm: '',
        sourceLanguage: newEntry.sourceLanguage,
        targetLanguage: newEntry.targetLanguage,
        category: ''
      });
      loadEntries();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add entry');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await axios.delete(`${API_URL}/api/glossary/${id}`);
      setSuccess('Entry deleted');
      loadEntries();
    } catch (err) {
      setError('Failed to delete entry');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/glossary/import`, formData);
      setSuccess(`Imported ${response.data.count} entries`);
      loadEntries();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (filterSource) params.sourceLanguage = filterSource;
      if (filterTarget) params.targetLanguage = filterTarget;

      window.open(
        `${API_URL}/api/glossary/export?${new URLSearchParams(params).toString()}`,
        '_blank'
      );
    } catch (err) {
      setError('Export failed');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL glossary entries? This cannot be undone!')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/glossary`);
      setSuccess('All entries cleared');
      loadEntries();
    } catch (err) {
      setError('Failed to clear glossary');
    }
  };

  const handleSearchOnline = async () => {
    if (!searchTerm || !newEntry.sourceLanguage || !newEntry.targetLanguage) {
      setError('Enter a term and select languages to search');
      return;
    }

    setSearching(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_URL}/api/term-lookup/search`, {
        params: {
          term: searchTerm,
          sourceLanguage: newEntry.sourceLanguage,
          targetLanguage: newEntry.targetLanguage
        }
      });

      setSearchResults(response.data);
      setSuccess(`Found ${response.data.onlineResults.length} online suggestions`);
    } catch (err) {
      setError('Online search failed: ' + (err.response?.data?.error || err.message));
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFromSearch = async (result) => {
    try {
      await axios.post(`${API_URL}/api/term-lookup/add-to-glossary`, {
        sourceTerm: searchTerm,
        targetTerm: result.translation,
        sourceLanguage: newEntry.sourceLanguage,
        targetLanguage: newEntry.targetLanguage,
        source: result.source
      });
      
      setSuccess(`Added "${searchTerm}" → "${result.translation}" from ${result.source}`);
      setSearchTerm('');
      setSearchResults(null);
      loadEntries();
    } catch (err) {
      setError('Failed to add to glossary');
    }
  };

  return (
    <div className="glossary-tab">
      <h2>Glossary Management</h2>
      
      <div className="glossary-actions">
        <div className="import-export">
          <input
            type="file"
            accept=".csv"
            onChange={handleImport}
            id="csv-import"
            style={{ display: 'none' }}
          />
          <label htmlFor="csv-import" className="btn-secondary">
            📥 Import CSV
          </label>
          <button onClick={handleExport} className="btn-secondary">
            📤 Export CSV
          </button>
          <button onClick={handleClearAll} className="btn-danger">
            🗑️ Clear All
          </button>
        </div>

        <div className="filter-section">
          <select 
            value={filterSource} 
            onChange={(e) => setFilterSource(e.target.value)}
            className="filter-select"
          >
            <option value="">All Source Languages</option>
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
          <select 
            value={filterTarget} 
            onChange={(e) => setFilterTarget(e.target.value)}
            className="filter-select"
          >
            <option value="">All Target Languages</option>
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="online-search-section">
        <h3>🌐 Search Online for Terms</h3>
        <p className="help-text">
          Search online dictionaries and translation resources for terms not in your glossary
        </p>
        
        <div className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter term to search online..."
              className="search-input"
            />
            <button 
              onClick={handleSearchOnline}
              disabled={searching || !searchTerm}
              className="btn-secondary"
            >
              {searching ? '🔍 Searching...' : '🌐 Search Online'}
            </button>
          </div>

          {searchResults && (
            <div className="search-results">
              {searchResults.inGlossary && (
                <div className="glossary-match">
                  <strong>✓ Already in glossary:</strong> {searchResults.glossaryTranslation}
                </div>
              )}

              {searchResults.onlineResults.length > 0 ? (
                <div>
                  <h4>Online Suggestions:</h4>
                  {searchResults.onlineResults.map((result, index) => (
                    <div key={index} className="search-result-item">
                      <div className="result-content">
                        <span className="result-translation">{result.translation}</span>
                        <span className="result-source">from {result.source}</span>
                        <span className="result-confidence">
                          {Math.round(result.confidence * 100)}% confidence
                        </span>
                      </div>
                      <button 
                        onClick={() => handleAddFromSearch(result)}
                        className="btn-small btn-primary"
                      >
                        ➕ Add to Glossary
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-results">No online results found. Try a different term.</p>
              )}

              {searchResults.sources.length > 0 && (
                <div className="sources-info">
                  <p><strong>Sources checked:</strong></p>
                  <ul>
                    {searchResults.sources.map((source, index) => (
                      <li key={index}>
                        {source.source}
                        {source.url && (
                          <a href={source.url} target="_blank" rel="noopener noreferrer"> (view)</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="add-entry-form">
        <h3>Add New Entry Manually</h3>
        <form onSubmit={handleAdd}>
          <div className="form-grid">
            <div className="form-group">
              <label>Source Term</label>
              <input
                type="text"
                value={newEntry.sourceTerm}
                onChange={(e) => setNewEntry({...newEntry, sourceTerm: e.target.value})}
                placeholder="Enter source term"
              />
            </div>

            <div className="form-group">
              <label>Target Term</label>
              <input
                type="text"
                value={newEntry.targetTerm}
                onChange={(e) => setNewEntry({...newEntry, targetTerm: e.target.value})}
                placeholder="Enter target term"
              />
            </div>

            <div className="form-group">
              <label>Source Language</label>
              <select
                value={newEntry.sourceLanguage}
                onChange={(e) => setNewEntry({...newEntry, sourceLanguage: e.target.value})}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Target Language</label>
              <select
                value={newEntry.targetLanguage}
                onChange={(e) => setNewEntry({...newEntry, targetLanguage: e.target.value})}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Category (Optional)</label>
              <input
                type="text"
                value={newEntry.category}
                onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                placeholder="e.g., Medical, Technical"
              />
            </div>

            <div className="form-group">
              <button type="submit" className="btn-primary">
                ➕ Add Entry
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="entries-list">
        <h3>Glossary Entries ({entries.length})</h3>
        
        {entries.length === 0 ? (
          <p className="no-entries">No entries yet. Add your first entry or import a CSV file.</p>
        ) : (
          <div className="entries-table">
            <table>
              <thead>
                <tr>
                  <th>Source Term</th>
                  <th>Target Term</th>
                  <th>Languages</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id}>
                    <td>{entry.source_term}</td>
                    <td>{entry.target_term}</td>
                    <td>{entry.source_language} → {entry.target_language}</td>
                    <td>{entry.category || '-'}</td>
                    <td>
                      <button 
                        onClick={() => handleDelete(entry.id)}
                        className="btn-small btn-danger"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glossary-info">
        <h4>CSV Format for Import</h4>
        <p>Your CSV file should have the following columns:</p>
        <code>Source Term, Target Term, Source Language, Target Language, Category</code>
        <p>Example:</p>
        <code>hello,hola,en,es,Greetings</code>
      </div>
    </div>
  );
}

export default GlossaryTab;

