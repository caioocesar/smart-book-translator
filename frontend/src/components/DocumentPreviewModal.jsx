import { useState, useEffect, useRef } from 'react';
import { ReactReader } from 'react-reader';
import '../styles/DocumentPreviewModal.css';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * DocumentPreviewModal - Preview documents before download
 * 
 * Supports:
 * - PDF preview using iframe
 * - EPUB preview using react-reader (epub.js)
 * - DOCX preview (text extraction via API)
 * - TXT preview (direct text display)
 */
function DocumentPreviewModal({ jobId, filename, format, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewContent, setPreviewContent] = useState(null);
  const [location, setLocation] = useState(null);
  const renditionRef = useRef(null);

  useEffect(() => {
    loadPreview();
    
    // Cleanup blob URL when component unmounts
    return () => {
      if (previewContent?.type === 'epub' && previewContent?.url) {
        URL.revokeObjectURL(previewContent.url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const loadPreview = async () => {
    setLoading(true);
    setError('');

    try {
      if (format === 'pdf') {
        // For PDF, we can use iframe with the download URL
        setPreviewContent({
          type: 'pdf',
          url: `${API_URL}/api/translation/download-partial/${jobId}#toolbar=0`
        });
      } else if (format === 'epub') {
        // For EPUB, we need to load it as an array buffer for react-reader
        const response = await fetch(`${API_URL}/api/translation/download-partial/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to load EPUB file');
        }
        const blob = await response.blob();
        const epubUrl = URL.createObjectURL(blob);
        
        setPreviewContent({
          type: 'epub',
          url: epubUrl
        });
      } else if (format === 'txt') {
        // For TXT, fetch and display the content
        const response = await fetch(`${API_URL}/api/translation/download-partial/${jobId}`);
        const text = await response.text();
        setPreviewContent({
          type: 'text',
          content: text
        });
      } else if (format === 'docx') {
        // For DOCX, show info message (would need mammoth.js for full preview)
        setPreviewContent({
          type: 'info',
          message: `DOCX preview is not yet available. Please download to view the document.`
        });
      } else {
        setPreviewContent({
          type: 'info',
          message: 'Preview not available for this format. Please download to view.'
        });
      }
    } catch (err) {
      console.error('Preview load error:', err);
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const locationChanged = (epubcfi) => {
    setLocation(epubcfi);
  };

  const handleDownload = () => {
    window.open(`${API_URL}/api/translation/download-partial/${jobId}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content document-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📄 Document Preview</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="preview-info">
            <span className="preview-filename">📄 {filename}</span>
            <span className="preview-format">{format.toUpperCase()}</span>
          </div>

          {loading && (
            <div className="preview-loading">
              <div className="spinner"></div>
              <p>Loading preview...</p>
            </div>
          )}

          {error && (
            <div className="preview-error">
              <p>❌ {error}</p>
            </div>
          )}

          {!loading && !error && previewContent && (
            <div className="preview-container">
              {previewContent.type === 'pdf' && (
                <iframe
                  src={previewContent.url}
                  className="pdf-preview"
                  title="PDF Preview"
                />
              )}

              {previewContent.type === 'epub' && (
                <div className="epub-preview">
                  <ReactReader
                    url={previewContent.url}
                    location={location}
                    locationChanged={locationChanged}
                    getRendition={(rendition) => {
                      renditionRef.current = rendition;
                    }}
                  />
                </div>
              )}

              {previewContent.type === 'text' && (
                <div className="text-preview-container">
                  <div className="text-preview-content">
                    {previewContent.content.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}

              {previewContent.type === 'info' && (
                <div className="preview-info-message">
                  <div className="info-icon">ℹ️</div>
                  <p>{previewContent.message}</p>
                  <p className="help-text">
                    Click the download button below to save and view the full document.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={handleDownload}>
            ⬇️ Download Document
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentPreviewModal;
