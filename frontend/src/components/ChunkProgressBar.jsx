import { useState } from 'react';
import '../styles/ChunkProgressBar.css';

/**
 * ChunkProgressBar - uTorrent-style visualization for translation chunks
 * 
 * Shows a compact visual representation of chunk status, suitable for
 * large documents with thousands of chunks.
 * 
 * Each small square represents one or more chunks, color-coded by status.
 */
function ChunkProgressBar({ chunks, totalChunks, onChunkClick }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [showLegend, setShowLegend] = useState(true);

  // Calculate how many chunks per square for optimal display
  // For large books, group chunks together
  const calculateChunksPerSquare = (total) => {
    if (total <= 100) return 1;
    if (total <= 500) return 5;
    if (total <= 1000) return 10;
    if (total <= 5000) return 25;
    return 50;
  };

  const chunksPerSquare = calculateChunksPerSquare(totalChunks);
  const totalSquares = Math.ceil(totalChunks / chunksPerSquare);

  // Group chunks into squares
  const squares = [];
  for (let i = 0; i < totalSquares; i++) {
    const startChunk = i * chunksPerSquare;
    const endChunk = Math.min(startChunk + chunksPerSquare, totalChunks);
    const squareChunks = chunks.slice(startChunk, endChunk);

    // Determine dominant status for this square
    const statusCounts = {
      completed: 0,
      failed: 0,
      translating: 0,
      'llm-enhancing': 0,
      pending: 0
    };

    squareChunks.forEach(chunk => {
      // Check processing layer for more detailed status
      if (chunk.status === 'translating' && chunk.processing_layer === 'llm-enhancing') {
        statusCounts['llm-enhancing'] = (statusCounts['llm-enhancing'] || 0) + 1;
      } else {
        statusCounts[chunk.status] = (statusCounts[chunk.status] || 0) + 1;
      }
    });

    // Determine which status to display
    let status = 'pending';
    let layer = null;
    if (statusCounts.failed > 0) {
      status = 'failed';
    } else if (statusCounts['llm-enhancing'] > 0) {
      status = 'llm-enhancing';
      layer = 'llm-enhancing';
    } else if (statusCounts.translating > 0) {
      status = 'translating';
      layer = 'translating';
    } else if (statusCounts.completed === squareChunks.length) {
      status = 'completed';
    } else if (statusCounts.completed > 0) {
      status = 'partial';
    }

    squares.push({
      index: i,
      startChunk,
      endChunk,
      status,
      layer,
      statusCounts,
      chunks: squareChunks
    });
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      translating: '#17a2b8',
      'llm-enhancing': '#9c27b0', // Purple for LLM layer
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
      'llm-enhancing': '🤖', // Robot icon for LLM enhancement
      completed: '✅',
      failed: '❌',
      partial: '⚠️'
    };
    return icons[status] || '●';
  };

  const getStatusLabel = (status, layer) => {
    if (status === 'translating' && layer === 'llm-enhancing') {
      return 'LLM Enhancing';
    }
    if (status === 'llm-enhancing') {
      return 'LLM Enhancing';
    }
    const labels = {
      pending: 'Pending',
      translating: 'Translating',
      completed: 'Completed',
      failed: 'Failed',
      partial: 'Partial'
    };
    return labels[status] || status;
  };

  const handleSquareClick = (square) => {
    if (onChunkClick) {
      onChunkClick(square);
    }
  };

  const handleSquareHover = (index) => {
    setHoveredIndex(index);
  };

  // Calculate statistics
  const stats = {
    completed: chunks.filter(c => c.status === 'completed').length,
    failed: chunks.filter(c => c.status === 'failed').length,
    translating: chunks.filter(c => c.status === 'translating' && (!c.processing_layer || c.processing_layer === 'translating')).length,
    'llm-enhancing': chunks.filter(c => c.status === 'translating' && c.processing_layer === 'llm-enhancing').length,
    pending: chunks.filter(c => c.status === 'pending').length
  };

  const percentComplete = ((stats.completed / totalChunks) * 100).toFixed(1);

  return (
    <div className="chunk-progress-container">
      {/* Summary Stats */}
      <div className="chunk-stats-summary">
        <div className="stat-item">
          <span className="stat-label">Total:</span>
          <span className="stat-value">{totalChunks}</span>
        </div>
        <div className="stat-item completed">
          <span className="stat-icon">✅</span>
          <span className="stat-value">{stats.completed}</span>
        </div>
        <div className="stat-item failed">
          <span className="stat-icon">❌</span>
          <span className="stat-value">{stats.failed}</span>
        </div>
        <div className="stat-item translating">
          <span className="stat-icon">🔄</span>
          <span className="stat-value">{stats.translating}</span>
          <span className="stat-label-small">1st Layer</span>
        </div>
        {stats['llm-enhancing'] > 0 && (
          <div className="stat-item llm-enhancing">
            <span className="stat-icon">🤖</span>
            <span className="stat-value">{stats['llm-enhancing']}</span>
            <span className="stat-label-small">LLM</span>
          </div>
        )}
        <div className="stat-item pending">
          <span className="stat-icon">⏳</span>
          <span className="stat-value">{stats.pending}</span>
        </div>
        <div className="stat-item percent">
          <span className="stat-label">Complete:</span>
          <span className="stat-value">{percentComplete}%</span>
        </div>
      </div>

      {/* Progress Bar Visualization */}
      <div className="chunk-progress-visual">
        <div className="chunks-grid-compact">
          {squares.map((square) => (
            <div
              key={square.index}
              className={`chunk-square ${square.status} ${hoveredIndex === square.index ? 'hovered' : ''}`}
              style={{ backgroundColor: getStatusColor(square.status) }}
              onClick={() => handleSquareClick(square)}
              onMouseEnter={() => handleSquareHover(square.index)}
              onMouseLeave={() => handleSquareHover(null)}
              title={`Chunks ${square.startChunk + 1}-${square.endChunk}: ${square.status}`}
            />
          ))}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredIndex !== null && squares[hoveredIndex] && (
        <div className="chunk-tooltip">
          <div className="tooltip-header">
            <strong>Chunks {squares[hoveredIndex].startChunk + 1}-{squares[hoveredIndex].endChunk}</strong>
            <span className="tooltip-icon">{getStatusIcon(squares[hoveredIndex].status)}</span>
          </div>
          <div className="tooltip-details">
            <div className="tooltip-stat">
              ✅ Completed: {squares[hoveredIndex].statusCounts.completed}
            </div>
            <div className="tooltip-stat">
              ❌ Failed: {squares[hoveredIndex].statusCounts.failed}
            </div>
            <div className="tooltip-stat">
              🔄 Translating (1st Layer): {squares[hoveredIndex].statusCounts.translating}
            </div>
            {squares[hoveredIndex].statusCounts['llm-enhancing'] > 0 && (
              <div className="tooltip-stat">
                🤖 LLM Enhancing (2nd Layer): {squares[hoveredIndex].statusCounts['llm-enhancing']}
              </div>
            )}
            <div className="tooltip-stat">
              ⏳ Pending: {squares[hoveredIndex].statusCounts.pending}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="chunk-legend">
          <button 
            className="legend-toggle"
            onClick={() => setShowLegend(false)}
            title="Hide legend"
          >
            ✕
          </button>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: getStatusColor('completed') }}></div>
              <span>Completed</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: getStatusColor('failed') }}></div>
              <span>Failed</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: getStatusColor('translating') }}></div>
              <span>Translating (1st Layer)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: getStatusColor('llm-enhancing') }}></div>
              <span>LLM Enhancing (2nd Layer)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: getStatusColor('pending') }}></div>
              <span>Pending</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: getStatusColor('partial') }}></div>
              <span>Partial</span>
            </div>
          </div>
          <div className="legend-note">
            {chunksPerSquare > 1 && (
              <small>Each square represents {chunksPerSquare} chunk(s)</small>
            )}
          </div>
        </div>
      )}

      {!showLegend && (
        <button 
          className="legend-show"
          onClick={() => setShowLegend(true)}
          title="Show legend"
        >
          ℹ️ Legend
        </button>
      )}

      {/* Info about scalability */}
      {totalChunks > 100 && (
        <div className="scalability-info">
          <small>
            📊 This document has {totalChunks} chunks. Showing {totalSquares} squares for clarity
            {chunksPerSquare > 1 && ` (${chunksPerSquare} chunks per square)`}.
          </small>
        </div>
      )}
    </div>
  );
}

export default ChunkProgressBar;


