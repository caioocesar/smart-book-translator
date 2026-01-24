import { useState } from 'react';
import axios from 'axios';
import '../styles/ChunkModal.css';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * ChunkModal - Detailed preview of translation chunks
 * 
 * Shows complete chunk information including:
 * - Original and translated text
 * - Chunk metadata (status, timestamps, token count)
 * - Error information if failed
 * - LLM processing details
 * - Edit capability for completed chunks
 */
function ChunkModal({ chunks, onClose, onChunkUpdated }) {
  const [selectedChunkIndex, setSelectedChunkIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  if (!chunks || chunks.length === 0) {
    return null;
  }

  const selectedChunk = chunks[selectedChunkIndex];
  const canEdit = selectedChunk.status === 'completed' && (selectedChunk.translated_text || selectedChunk.translated_html);

  const handleStartEdit = () => {
    const textToEdit = selectedChunk.translated_html || selectedChunk.translated_text;
    // Strip HTML tags for editing
    const cleanText = textToEdit.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    setEditedText(cleanText);
    setIsEditing(true);
    setSaveError('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText('');
    setSaveError('');
  };

  const handleSaveEdit = async () => {
    if (!editedText.trim()) {
      setSaveError('Translation cannot be empty');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      await axios.put(`${API_URL}/api/translation/chunk/${selectedChunk.id}`, {
        translated_text: editedText,
        translated_html: null // Clear HTML when manually editing
      });

      // Update the chunk in memory
      chunks[selectedChunkIndex].translated_text = editedText;
      chunks[selectedChunkIndex].translated_html = null;

      setIsEditing(false);
      setEditedText('');

      // Notify parent to refresh if callback provided
      if (onChunkUpdated) {
        onChunkUpdated(selectedChunk.id);
      }
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      translating: '#17a2b8',
      'llm-enhancing': '#9c27b0',
      completed: '#28a745',
      failed: '#dc3545',
      partial: '#fd7e14'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      translating: '🔄',
      'llm-enhancing': '🤖',
      completed: '✅',
      failed: '❌',
      partial: '⚠️'
    };
    return icons[status] || '●';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const duration = (endTime - startTime) / 1000; // seconds
    
    if (duration < 60) {
      return `${duration.toFixed(1)}s`;
    }
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}m ${seconds}s`;
  };

  const stripHtmlTags = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  };

  const truncateText = (text, maxLength = 500) => {
    if (!text) return '';
    const cleaned = stripHtmlTags(text);
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content chunk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📄 Chunk Details</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Chunk Selector */}
          {chunks.length > 1 && (
            <div className="chunk-selector">
              <div className="chunk-selector-header">
                <span>Viewing chunk {selectedChunkIndex + 1} of {chunks.length}</span>
                <div className="chunk-navigation">
                  <button 
                    onClick={() => setSelectedChunkIndex(Math.max(0, selectedChunkIndex - 1))}
                    disabled={selectedChunkIndex === 0}
                    className="btn-nav"
                  >
                    ← Previous
                  </button>
                  <button 
                    onClick={() => setSelectedChunkIndex(Math.min(chunks.length - 1, selectedChunkIndex + 1))}
                    disabled={selectedChunkIndex === chunks.length - 1}
                    className="btn-nav"
                  >
                    Next →
                  </button>
                </div>
              </div>
              
              <div className="chunk-selector-grid">
                {chunks.map((chunk, index) => (
                  <button
                    key={index}
                    className={`chunk-mini ${chunk.status} ${selectedChunkIndex === index ? 'active' : ''}`}
                    style={{ backgroundColor: getStatusColor(chunk.status) }}
                    onClick={() => setSelectedChunkIndex(index)}
                    title={`Chunk ${index + 1}: ${chunk.status}`}
                  >
                    {getStatusIcon(chunk.status)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chunk Metadata */}
          <div className="chunk-metadata">
            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="metadata-label">Status:</span>
                <span className="metadata-value">
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedChunk.status) }}>
                    {getStatusIcon(selectedChunk.status)} {selectedChunk.status}
                  </span>
                </span>
              </div>
              
              <div className="metadata-item">
                <span className="metadata-label">Chunk Index:</span>
                <span className="metadata-value">{selectedChunk.chunk_index + 1}</span>
              </div>

              {selectedChunk.processing_layer && (
                <div className="metadata-item">
                  <span className="metadata-label">Processing Layer:</span>
                  <span className="metadata-value">
                    {selectedChunk.processing_layer === 'llm-enhancing' ? '🤖 LLM Enhancement' : '🔄 Translation'}
                  </span>
                </div>
              )}

              {selectedChunk.token_count && (
                <div className="metadata-item">
                  <span className="metadata-label">Tokens:</span>
                  <span className="metadata-value">{selectedChunk.token_count.toLocaleString()}</span>
                </div>
              )}

              {selectedChunk.char_count && (
                <div className="metadata-item">
                  <span className="metadata-label">Characters:</span>
                  <span className="metadata-value">{selectedChunk.char_count.toLocaleString()}</span>
                </div>
              )}

              {selectedChunk.started_at && (
                <div className="metadata-item">
                  <span className="metadata-label">Started:</span>
                  <span className="metadata-value">{formatTimestamp(selectedChunk.started_at)}</span>
                </div>
              )}

              {selectedChunk.completed_at && (
                <div className="metadata-item">
                  <span className="metadata-label">Completed:</span>
                  <span className="metadata-value">{formatTimestamp(selectedChunk.completed_at)}</span>
                </div>
              )}

              {selectedChunk.started_at && selectedChunk.completed_at && (
                <div className="metadata-item">
                  <span className="metadata-label">Duration:</span>
                  <span className="metadata-value">{formatDuration(selectedChunk.started_at, selectedChunk.completed_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Information */}
          {selectedChunk.status === 'failed' && selectedChunk.error && (
            <div className="chunk-error">
              <h3>❌ Error Details</h3>
              <div className="error-message">
                {selectedChunk.error}
              </div>
            </div>
          )}

          {/* LLM Processing Details */}
          {(selectedChunk.llm_model || selectedChunk.llm_duration || selectedChunk.llm_stages) && (
            <div className="chunk-llm-stats">
              <h3>🤖 LLM Processing</h3>
              <div className="llm-stats-grid">
                {selectedChunk.llm_model && (
                  <div className="stat-item">
                    <span className="stat-label">Model:</span>
                    <span className="stat-value">{selectedChunk.llm_model}</span>
                  </div>
                )}
                {selectedChunk.llm_duration && (
                  <div className="stat-item">
                    <span className="stat-label">Duration:</span>
                    <span className="stat-value">{(selectedChunk.llm_duration / 1000).toFixed(1)}s</span>
                  </div>
                )}
                {selectedChunk.llm_stages && selectedChunk.llm_stages.length > 0 && (
                  <div className="stat-item full-width">
                    <span className="stat-label">Pipeline Stages:</span>
                    <div className="stages-list">
                      {selectedChunk.llm_stages.map((stage, idx) => (
                        <span key={idx} className="stage-badge">
                          {stage.stage}: {stage.status} ({(stage.duration / 1000).toFixed(1)}s)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Original Text */}
          {(selectedChunk.source_text || selectedChunk.source_html) && (
            <div className="chunk-text-section">
              <h3>📝 Original Text</h3>
              <div className="text-preview original">
                {(() => {
                  const text = selectedChunk.source_html || selectedChunk.source_text;
                  if (text.length > 500) {
                    return (
                      <details>
                        <summary>
                          {truncateText(text, 500)}
                          <span className="read-more"> (click to read full text)</span>
                        </summary>
                        <div className="full-text">
                          <div dangerouslySetInnerHTML={{ __html: text }} />
                        </div>
                      </details>
                    );
                  } else {
                    return <div dangerouslySetInnerHTML={{ __html: text }} />;
                  }
                })()}
              </div>
              <div className="text-stats">
                <small>
                  {(selectedChunk.source_html || selectedChunk.source_text).length.toLocaleString()} characters
                  {(selectedChunk.source_html || selectedChunk.source_text).includes('<') && ' (HTML)'}
                </small>
              </div>
            </div>
          )}

          {/* Translated Text */}
          {(selectedChunk.translated_text || selectedChunk.translated_html) && (
            <div className="chunk-text-section">
              <div className="section-header-with-actions">
                <h3>🌐 Translated Text</h3>
                {canEdit && !isEditing && (
                  <button className="btn-edit" onClick={handleStartEdit}>
                    ✏️ Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="edit-section">
                  <textarea
                    className="edit-textarea"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={15}
                    placeholder="Enter translated text..."
                  />
                  {saveError && (
                    <div className="error-message" style={{ marginTop: '8px', fontSize: '0.9em' }}>
                      {saveError}
                    </div>
                  )}
                  <div className="edit-actions">
                    <button 
                      className="btn-secondary" 
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={handleSaveEdit}
                      disabled={saving || !editedText.trim()}
                    >
                      {saving ? '⏳ Saving...' : '💾 Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-preview translated">
                    {(() => {
                      const text = selectedChunk.translated_html || selectedChunk.translated_text;
                      if (text.length > 500) {
                        return (
                          <details>
                            <summary>
                              {truncateText(text, 500)}
                              <span className="read-more"> (click to read full text)</span>
                            </summary>
                            <div className="full-text">
                              <div dangerouslySetInnerHTML={{ __html: text }} />
                            </div>
                          </details>
                        );
                      } else {
                        return <div dangerouslySetInnerHTML={{ __html: text }} />;
                      }
                    })()}
                  </div>
                  <div className="text-stats">
                    <small>
                      {(selectedChunk.translated_html || selectedChunk.translated_text).length.toLocaleString()} characters
                      {(selectedChunk.translated_html || selectedChunk.translated_text).includes('<') && ' (HTML)'}
                    </small>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChunkModal;
