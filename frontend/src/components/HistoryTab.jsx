import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

function HistoryTab({ settings, onTranslationReady }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingJob, setRetryingJob] = useState(null);
  const [retryOptions, setRetryOptions] = useState({
    jobId: null,
    provider: '',
    apiKey: '',
    fromBeginning: false
  });
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);
  const [jobChunks, setJobChunks] = useState({});
  const [generatingDocument, setGeneratingDocument] = useState(null);

  useEffect(() => {
    loadJobs();
    // Refresh every 10 seconds
    const interval = setInterval(loadJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/translation/jobs`);
      setJobs(response.data);
      setError('');
      
      // Notify parent if there are ready translations
      if (onTranslationReady) {
        const hasCompleted = response.data.some(job => job.status === 'completed');
        if (hasCompleted) {
          onTranslationReady();
        }
      }
    } catch (err) {
      setError('Failed to load translation history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobChunks = async (jobId) => {
    try {
      const response = await axios.get(`${API_URL}/api/translation/chunks/${jobId}`);
      setJobChunks(prev => ({ ...prev, [jobId]: response.data }));
    } catch (err) {
      console.error('Failed to load chunks:', err);
    }
  };

  const toggleJobExpand = (jobId) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(jobId);
      if (!jobChunks[jobId]) {
        loadJobChunks(jobId);
      }
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadJobs();
  };

  const openRetryModal = (job, fromBeginning = false) => {
    setRetryOptions({
      jobId: job.id,
      provider: job.api_provider,
      apiKey: settings[`${job.api_provider}_api_key`] || '',
      fromBeginning
    });
    setShowRetryModal(true);
  };

  const handleRetry = async () => {
    if (!retryOptions.apiKey && retryOptions.provider !== 'google') {
      setError('Please enter API key');
      return;
    }

    setRetryingJob(retryOptions.jobId);
    setShowRetryModal(false);

    try {
      const endpoint = retryOptions.fromBeginning 
        ? `/api/translation/retry-all/${retryOptions.jobId}`
        : `/api/translation/retry/${retryOptions.jobId}`;

      await axios.post(`${API_URL}${endpoint}`, {
        apiKey: retryOptions.apiKey,
        apiProvider: retryOptions.provider,
        apiOptions: settings[`${retryOptions.provider}_options`] || {}
      });

      setError('');
      setTimeout(loadJobs, 2000);
    } catch (err) {
      setError(`Retry failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setRetryingJob(null);
    }
  };

  const handleDownload = (jobId) => {
    window.open(`${API_URL}/api/translation/download/${jobId}`, '_blank');
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Delete this translation job? This cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/translation/jobs/${jobId}`);
      loadJobs();
    } catch (err) {
      setError('Failed to delete job');
    }
  };

  const handleGenerateDocument = async (jobId) => {
    setGeneratingDocument(jobId);
    try {
      const response = await axios.post(`${API_URL}/api/translation/generate/${jobId}`);
      setError('');
      alert('Document generated successfully!');
      loadJobs();
    } catch (err) {
      setError(`Failed to generate document: ${err.response?.data?.error || err.message}`);
    } finally {
      setGeneratingDocument(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      translating: '#17a2b8',
      completed: '#28a745',
      failed: '#dc3545',
      partial: '#fd7e14'
    };
    return colors[status] || '#6c757d';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getOutputPath = (job) => {
    if (job.status !== 'completed') return null;
    const outputDir = settings.outputDirectory || 'backend/outputs';
    return `${outputDir}/translated_${job.filename}`;
  };

  const getChunkStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      translating: '#17a2b8',
      completed: '#28a745',
      failed: '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getChunkStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      translating: '🔄',
      completed: '✅',
      failed: '❌'
    };
    return icons[status] || '●';
  };

  const canGenerateDocument = (job) => {
    return job.completed_chunks === job.total_chunks && job.failed_chunks === 0;
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="history-tab">
        <h2>Translation History</h2>
        <div className="loading-message">
          <p>⏳ Loading translation history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-tab">
      <div className="history-header">
        <h2>Translation History</h2>
        <button onClick={handleRefresh} className="btn-secondary" disabled={loading}>
          {loading ? '⏳ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {jobs.length === 0 ? (
        <div className="no-history">
          <p>📭 No translation history yet</p>
          <p className="help-text">Your completed and in-progress translations will appear here</p>
        </div>
      ) : (
        <div className="jobs-table">
          {jobs.map(job => (
            <div key={job.id} className="job-row">
              <div className="job-main">
                <div className="job-info">
                  <div className="job-title">
                    <strong>📄 {job.filename}</strong>
                    <span 
                      className="job-status-badge" 
                      style={{ backgroundColor: getStatusColor(job.status) }}
                    >
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="job-details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Languages:</span>
                      <span>{job.source_language} → {job.target_language}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">API:</span>
                      <span>{job.api_provider}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Format:</span>
                      <span>{job.output_format.toUpperCase()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Started:</span>
                      <span>{formatDate(job.created_at)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="job-progress">
                    <div className="progress-bar-small">
                      <div 
                        className="progress-fill-small"
                        style={{ 
                          width: `${(job.completed_chunks / job.total_chunks * 100) || 0}%`,
                          backgroundColor: getStatusColor(job.status)
                        }}
                      />
                    </div>
                    <span className="progress-text">
                      {job.completed_chunks} / {job.total_chunks} chunks 
                      ({Math.round((job.completed_chunks / job.total_chunks) * 100) || 0}%)
                      {job.failed_chunks > 0 && (
                        <span className="failed-count"> • {job.failed_chunks} failed</span>
                      )}
                    </span>
                  </div>

                  {/* Output Path */}
                  {job.status === 'completed' && (
                    <div className="output-path">
                      <span className="detail-label">📁 Output:</span>
                      <code>{getOutputPath(job)}</code>
                    </div>
                  )}

                  {/* Error Message */}
                  {job.error_message && (
                    <div className="job-error">
                      <strong>❌ Error:</strong> {job.error_message}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="job-actions-vertical">
                  {canGenerateDocument(job) && job.status !== 'completed' && (
                    <button 
                      onClick={() => handleGenerateDocument(job.id)}
                      className="btn-small btn-success"
                      disabled={generatingDocument === job.id}
                      title="Generate final translated document"
                    >
                      {generatingDocument === job.id ? '⏳ Generating...' : '📄 Generate Document'}
                    </button>
                  )}

                  {job.status === 'completed' && (
                    <button 
                      onClick={() => handleDownload(job.id)}
                      className="btn-small btn-success"
                      title="Download translated file"
                    >
                      ⬇️ Download
                    </button>
                  )}

                  {(job.status === 'failed' || job.status === 'partial') && (
                    <>
                      <button 
                        onClick={() => openRetryModal(job, false)}
                        className="btn-small btn-warning"
                        disabled={retryingJob === job.id}
                        title="Retry only failed chunks"
                      >
                        {retryingJob === job.id ? '⏳' : '🔄'} Retry Failed
                      </button>
                      <button 
                        onClick={() => openRetryModal(job, true)}
                        className="btn-small btn-info"
                        disabled={retryingJob === job.id}
                        title="Start translation from beginning"
                      >
                        {retryingJob === job.id ? '⏳' : '🔁'} Retry All
                      </button>
                    </>
                  )}

                  {job.status === 'translating' && (
                    <button className="btn-small" disabled>
                      ⏳ In Progress...
                    </button>
                  )}

                  <button 
                    onClick={() => toggleJobExpand(job.id)}
                    className="btn-small btn-info"
                    title="View chunk details"
                  >
                    {expandedJob === job.id ? '🔼 Hide Details' : '🔽 Show Details'}
                  </button>

                  <button 
                    onClick={() => handleDelete(job.id)}
                    className="btn-small btn-danger"
                    title="Delete this job"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Chunk Details */}
              {expandedJob === job.id && (
                <div className="chunks-details">
                  <h4>📦 Translation Chunks ({job.total_chunks} total)</h4>
                  {!jobChunks[job.id] ? (
                    <p className="loading-message">Loading chunks...</p>
                  ) : (
                    <div className="chunks-grid">
                      {jobChunks[job.id].map(chunk => (
                        <div 
                          key={chunk.id} 
                          className="chunk-item"
                          style={{ borderLeftColor: getChunkStatusColor(chunk.status) }}
                        >
                          <div className="chunk-header">
                            <span 
                              className="chunk-status-icon"
                              style={{ color: getChunkStatusColor(chunk.status) }}
                            >
                              {getChunkStatusIcon(chunk.status)}
                            </span>
                            <strong>Chunk #{chunk.chunk_index + 1}</strong>
                            <span 
                              className="chunk-status-badge"
                              style={{ backgroundColor: getChunkStatusColor(chunk.status) }}
                            >
                              {chunk.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="chunk-preview">
                            <div className="chunk-text">
                              <label>Source:</label>
                              <p>{chunk.source_text?.substring(0, 100)}...</p>
                            </div>
                            {chunk.translated_text && (
                              <div className="chunk-text">
                                <label>Translation:</label>
                                <p>{chunk.translated_text.substring(0, 100)}...</p>
                              </div>
                            )}
                            {chunk.error_message && (
                              <div className="chunk-error">
                                <strong>Error:</strong> {chunk.error_message}
                              </div>
                            )}
                          </div>
                          {chunk.retry_count > 0 && (
                            <div className="chunk-retry-count">
                              Retries: {chunk.retry_count}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Retry Modal */}
      {showRetryModal && (
        <div className="modal-overlay" onClick={() => setShowRetryModal(false)}>
          <div className="modal-content retry-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {retryOptions.fromBeginning ? '🔁 Retry Translation from Beginning' : '🔄 Retry Failed Chunks'}
            </h3>
            
            <p className="retry-info">
              {retryOptions.fromBeginning 
                ? 'This will re-translate the entire document from scratch.' 
                : 'This will only retry the chunks that failed.'}
            </p>

            <div className="retry-form">
              <div className="form-group">
                <label>Translation API</label>
                <select 
                  value={retryOptions.provider} 
                  onChange={(e) => setRetryOptions({...retryOptions, provider: e.target.value, apiKey: ''})}
                >
                  <option value="google">Google Translate (Free)</option>
                  <option value="deepl">DeepL</option>
                  <option value="openai">OpenAI</option>
                  <option value="chatgpt">ChatGPT</option>
                </select>
                <p className="help-text">
                  💡 Change API if the previous one hit rate limits
                </p>
              </div>

              {retryOptions.provider !== 'google' && (
                <div className="form-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={retryOptions.apiKey}
                    onChange={(e) => setRetryOptions({...retryOptions, apiKey: e.target.value})}
                    placeholder="Enter API key"
                  />
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={handleRetry} className="btn-primary">
                {retryOptions.fromBeginning ? '🔁 Retry All' : '🔄 Retry Failed'}
              </button>
              <button onClick={() => setShowRetryModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryTab;


