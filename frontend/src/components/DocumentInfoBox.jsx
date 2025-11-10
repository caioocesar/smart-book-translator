import React from 'react';
import { t } from '../utils/i18n.js';
import './DocumentInfoBox.css';

function DocumentInfoBox({ documentInfo, recommendations, onSelectRecommendation }) {
  if (!documentInfo) {
    return null;
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  return (
    <div className="document-info-box">
      <div className="document-info-header">
        <h3>📄 {t('documentInfo') || 'Document Information'}</h3>
      </div>
      
      <div className="document-info-content">
        <div className="info-row">
          <span className="info-label">{t('fileSize') || 'File Size'}:</span>
          <span className="info-value">{formatFileSize(documentInfo.fileSize)}</span>
        </div>
        
        <div className="info-row">
          <span className="info-label">{t('characterCount') || 'Characters'}:</span>
          <span className="info-value">{formatNumber(documentInfo.characterCount)}</span>
        </div>
        
        {documentInfo.wordCount && (
          <div className="info-row">
            <span className="info-label">{t('wordCount') || 'Words'}:</span>
            <span className="info-value">{formatNumber(documentInfo.wordCount)}</span>
          </div>
        )}
        
        {documentInfo.pages && (
          <div className="info-row">
            <span className="info-label">{t('pages') || 'Pages'}:</span>
            <span className="info-value">{formatNumber(documentInfo.pages)}</span>
          </div>
        )}
        
        {documentInfo.estimatedChunks && (
          <div className="info-row">
            <span className="info-label">{t('estimatedChunks') || 'Estimated Chunks'}:</span>
            <span className="info-value">{formatNumber(documentInfo.estimatedChunks)}</span>
          </div>
        )}
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>💡 {t('recommendedModels') || 'Recommended Models'}</h4>
          <div className="recommendations-list">
            {recommendations.slice(0, 5).map((rec, index) => (
              <div 
                key={index} 
                className={`recommendation-card ${index === 0 ? 'recommended' : ''}`}
                onClick={() => onSelectRecommendation && onSelectRecommendation(rec)}
              >
                <div className="recommendation-header">
                  <span className="recommendation-model">{rec.model}</span>
                  {index === 0 && <span className="recommendation-badge">⭐ {t('bestChoice') || 'Best Choice'}</span>}
                </div>
                <div className="recommendation-details">
                  <div className="recommendation-reason">{rec.reason}</div>
                  <div className="recommendation-specs">
                    <span>{t('chunkSize') || 'Chunk Size'}: {rec.recommendedChunkSize.toLocaleString()} {t('characters') || 'chars'}</span>
                    <span>•</span>
                    <span>{t('estimatedChunks') || 'Chunks'}: {rec.estimatedChunks}</span>
                    {rec.cost !== undefined && (
                      <>
                        <span>•</span>
                        <span>{t('estimatedCost') || 'Cost'}: ${rec.cost.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                  {rec.supportsGlossary && (
                    <div className="recommendation-feature">✓ {t('supportsGlossary') || 'Supports Glossary'}</div>
                  )}
                  {rec.supportsHtml && (
                    <div className="recommendation-feature">✓ {t('preservesFormatting') || 'Preserves Formatting'}</div>
                  )}
                  {rec.warning && (
                    <div className="recommendation-warning">⚠️ {rec.warning}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentInfoBox;

