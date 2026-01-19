import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const errorLogPath = path.join(logsDir, 'errors.log');
const connectionLogPath = path.join(logsDir, 'connections.log');
const apiLogPath = path.join(logsDir, 'api.log');
const appLogPath = path.join(logsDir, 'app.log');

/**
 * Write log entry to file
 */
function writeLog(filePath, level, message, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...details
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(filePath, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}

function writeAppLog(level, message, details = {}) {
  writeLog(appLogPath, level, message, details);
}

/**
 * Log connection errors and issues
 */
export function logConnection(provider, action, success, details = {}) {
  const message = success 
    ? `Connection successful: ${provider} - ${action}`
    : `Connection failed: ${provider} - ${action}`;
  
  writeLog(connectionLogPath, success ? 'INFO' : 'ERROR', message, {
    provider,
    action,
    success,
    ...details
  });
  writeAppLog(success ? 'INFO' : 'ERROR', message, {
    category: 'connection',
    provider,
    action,
    success,
    ...details
  });
}

/**
 * Log API errors with full details
 */
export function logApiError(provider, endpoint, error, requestDetails = {}) {
  const errorDetails = {
    provider,
    endpoint,
    error: {
      message: error.message,
      status: error.status || error.statusCode || error.response?.status,
      code: error.code,
      stack: error.stack,
      response: error.response?.data ? JSON.stringify(error.response.data) : undefined
    },
    request: requestDetails,
    timestamp: new Date().toISOString()
  };
  
  writeLog(errorLogPath, 'ERROR', `API Error: ${provider} - ${endpoint}`, errorDetails);
  writeAppLog('ERROR', `API Error: ${provider} - ${endpoint}`, errorDetails);
  
  // Also log to console for immediate visibility
  console.error(`[API ERROR] ${provider} - ${endpoint}:`, error.message);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Log API requests and responses
 */
export function logApiRequest(provider, endpoint, requestDetails, responseDetails = null) {
  writeLog(apiLogPath, 'INFO', `API Request: ${provider} - ${endpoint}`, {
    provider,
    endpoint,
    request: requestDetails,
    response: responseDetails,
    timestamp: new Date().toISOString()
  });
  writeAppLog('INFO', `API Request: ${provider} - ${endpoint}`, {
    provider,
    endpoint,
    request: requestDetails,
    response: responseDetails,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log general errors
 */
export function logError(category, message, error, context = {}) {
  // Don't log "null" when error is intentionally null
  const errorMessage = error?.message || (error !== null ? String(error) : undefined);
  
  const errorDetails = {
    category,
    message,
    error: error ? {
      message: errorMessage,
      stack: error?.stack,
      name: error?.name
    } : undefined,
    context,
    timestamp: new Date().toISOString()
  };
  
  writeLog(errorLogPath, 'ERROR', `${category}: ${message}`, errorDetails);
  writeAppLog('ERROR', `${category}: ${message}`, errorDetails);
  if (errorMessage) {
    console.error(`[${category}] ${message}:`, errorMessage);
  } else {
    console.error(`[${category}] ${message}`);
  }
}

/**
 * Log informational/success messages
 */
export function logInfo(category, message, context = {}) {
  const infoDetails = {
    category,
    message,
    context,
    timestamp: new Date().toISOString()
  };
  
  writeLog(errorLogPath, 'INFO', `${category}: ${message}`, infoDetails);
  writeAppLog('INFO', `${category}: ${message}`, infoDetails);
  console.log(`[${category}] ${message}`, context && Object.keys(context).length > 0 ? context : '');
}

/**
 * Get recent logs
 */
export function getRecentLogs(logType = 'errors', maxLines = 100) {
  let filePath;
  switch (logType) {
    case 'errors':
      filePath = errorLogPath;
      break;
    case 'connections':
      filePath = connectionLogPath;
      break;
    case 'api':
      filePath = apiLogPath;
      break;
    case 'app':
      filePath = appLogPath;
      break;
    default:
      filePath = errorLogPath;
  }
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const allLines = content.trim().split('\n').filter(line => line.trim());
    const recentLines = allLines.slice(-maxLines);
    return recentLines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
  } catch (err) {
    console.error('Failed to read logs:', err);
    return [];
  }
}

/**
 * Clear old logs (keep last N entries)
 */
export function clearOldLogs(logType = 'errors', keepLines = 1000) {
  let filePath;
  switch (logType) {
    case 'errors':
      filePath = errorLogPath;
      break;
    case 'connections':
      filePath = connectionLogPath;
      break;
    case 'api':
      filePath = apiLogPath;
      break;
    case 'app':
      filePath = appLogPath;
      break;
    default:
      return;
  }
  
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length > keepLines) {
      const recentLines = lines.slice(-keepLines);
      fs.writeFileSync(filePath, recentLines.join('\n') + '\n', 'utf8');
    }
  } catch (err) {
    console.error('Failed to clear old logs:', err);
  }
}

export default {
  logConnection,
  logApiError,
  logApiRequest,
  logError,
  logInfo,
  getRecentLogs,
  clearOldLogs
};

