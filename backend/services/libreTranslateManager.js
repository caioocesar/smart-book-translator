import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import Logger from '../utils/logger.js';
import Settings from '../models/Settings.js';

const execAsync = promisify(exec);

/**
 * LibreTranslate Manager
 * 
 * Manages LibreTranslate instance:
 * - Health checks
 * - Get supported languages
 * - Start/stop via Docker
 * - Status monitoring
 */

class LibreTranslateManager {
  constructor(url = 'http://localhost:5001') {
    this.url = url;
    this.status = 'unknown';
    this.languages = [];
    this.lastCheck = null;
  }

  /**
   * Resolve the configured LibreTranslate URL.
   * Priority: Settings > env > default.
   */
  getConfiguredUrl() {
    try {
      const settingsUrl = Settings.get('localTranslationUrl');
      if (typeof settingsUrl === 'string' && settingsUrl.trim()) {
        return settingsUrl.trim();
      }
    } catch {
      // ignore settings read errors
    }

    if (process.env.LIBRETRANSLATE_URL && process.env.LIBRETRANSLATE_URL.trim()) {
      return process.env.LIBRETRANSLATE_URL.trim();
    }

    return this.url || 'http://localhost:5001';
  }

  getEffectiveUrl() {
    const configured = this.getConfiguredUrl();
    if (configured && configured !== this.url) {
      this.url = configured;
    }
    return this.url;
  }

  resolveUrl(urlOverride) {
    if (typeof urlOverride === 'string' && urlOverride.trim()) {
      return urlOverride.trim();
    }
    return this.getEffectiveUrl();
  }

  /**
   * Check if LibreTranslate is running
   * @returns {Promise<Object>} {running, version, languages}
   */
  async healthCheck(urlOverride = null) {
    try {
      const baseUrl = this.resolveUrl(urlOverride);
      const response = await axios.get(`${baseUrl}/languages`, {
        timeout: 15000 // Increased from 5s to 15s for slower systems
      });

      this.status = 'running';
      this.languages = response.data || [];
      this.lastCheck = new Date().toISOString();

      Logger.logError('libreTranslate', 'Health check successful', null, {
        languageCount: this.languages.length,
        url: baseUrl
      });

      return {
        running: true,
        languages: this.languages,
        languageCount: this.languages.length,
        url: baseUrl,
        timestamp: this.lastCheck
      };
    } catch (error) {
      this.status = error.code === 'ECONNREFUSED' ? 'stopped' : 'error';
      this.lastCheck = new Date().toISOString();

      Logger.logError('libreTranslate', 'Health check failed', error, {
        url: this.resolveUrl(urlOverride),
        errorCode: error.code
      });

      return {
        running: false,
        error: error.message,
        errorCode: error.code,
        url: this.resolveUrl(urlOverride),
        timestamp: this.lastCheck
      };
    }
  }

  /**
   * Get supported languages
   * @returns {Promise<Array>} Array of language objects
   */
  async getLanguages(urlOverride = null) {
    try {
      const baseUrl = this.resolveUrl(urlOverride);
      const response = await axios.get(`${baseUrl}/languages`, {
        timeout: 5000
      });

      this.languages = response.data || [];
      return this.languages;
    } catch (error) {
      Logger.logError('libreTranslate', 'Failed to get languages', error, {
        url: this.resolveUrl(urlOverride)
      });
      throw error;
    }
  }

  /**
   * Check if Docker is available
   * @returns {Promise<boolean>}
   */
  async isDockerAvailable() {
    try {
      await execAsync('docker --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Docker daemon is running
   * @returns {Promise<boolean>}
   */
  async isDockerRunning() {
    try {
      await execAsync('docker ps', { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if port 5001 is in use
   * @returns {Promise<{inUse: boolean, processId: string|null}>}
   */
  async isPortInUse() {
    try {
      // Windows command to check port
      const { stdout } = await execAsync('netstat -ano | findstr :5001');
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          // Extract PID from the end of the line
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          return { inUse: true, processId: pid };
        }
      }
      
      return { inUse: false, processId: null };
    } catch (error) {
      // If netstat fails or no results, assume port is free
      return { inUse: false, processId: null };
    }
  }

  /**
   * Check if LibreTranslate container is running
   * @returns {Promise<{running: boolean, booting: boolean, containerId: string|null}>}
   */
  async isContainerRunning() {
    try {
      // Check by image first
      const { stdout: byImage } = await execAsync('docker ps --filter "ancestor=libretranslate/libretranslate" --format "{{.ID}}"');
      if (byImage.trim().length > 0) {
        const containerId = byImage.trim().split('\n')[0];
        // Container exists, check if it's responding
        const health = await this.healthCheck();
        return { 
          running: true, 
          booting: !health.running, // If container exists but not responding, it's booting
          containerId 
        };
      }
      
      // Also check by name (in case container was started manually)
      const { stdout: byName } = await execAsync('docker ps --filter "name=libretranslate" --format "{{.ID}}"');
      if (byName.trim().length > 0) {
        const containerId = byName.trim().split('\n')[0];
        // Container exists, check if it's responding
        const health = await this.healthCheck();
        return { 
          running: true, 
          booting: !health.running, // If container exists but not responding, it's booting
          containerId 
        };
      }
      
      // No container found
      return { running: false, booting: false, containerId: null };
    } catch (error) {
      return { running: false, booting: false, containerId: null };
    }
  }

  /**
   * Get all LibreTranslate containers (running or stopped)
   * @returns {Promise<Array<string>>} Array of container IDs
   */
  async getAllLibreTranslateContainers() {
    try {
      // Find by name
      const { stdout: byName } = await execAsync('docker ps -a --filter "name=libretranslate" --format "{{.ID}}"');
      // Find by image
      const { stdout: byImage } = await execAsync('docker ps -a --filter "ancestor=libretranslate/libretranslate" --format "{{.ID}}"');
      
      const containers = new Set([
        ...byName.trim().split('\n').filter(id => id),
        ...byImage.trim().split('\n').filter(id => id)
      ]);
      
      return Array.from(containers);
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up all existing LibreTranslate containers
   * @param {boolean} onlyStoppedContainers - If true, only remove stopped/exited containers
   * @returns {Promise<void>}
   */
  async cleanupExistingContainers(onlyStoppedContainers = false) {
    try {
      let containers = [];
      
      if (onlyStoppedContainers) {
        // Only get stopped/exited containers to avoid killing running ones
        try {
          const { stdout: byName } = await execAsync('docker ps -a --filter "name=libretranslate" --filter "status=exited" --format "{{.ID}}"');
          const { stdout: byImage } = await execAsync('docker ps -a --filter "ancestor=libretranslate/libretranslate" --filter "status=exited" --format "{{.ID}}"');
          
          const containerSet = new Set([
            ...byName.trim().split('\n').filter(id => id),
            ...byImage.trim().split('\n').filter(id => id)
          ]);
          
          containers = Array.from(containerSet);
        } catch (error) {
          // Ignore errors when no stopped containers found
        }
      } else {
        // Get all containers (running or stopped)
        containers = await this.getAllLibreTranslateContainers();
      }
      
      if (containers.length > 0) {
        Logger.logError('libreTranslate', `Found ${containers.length} ${onlyStoppedContainers ? 'stopped' : 'existing'} container(s), cleaning up...`, null, {
          containers: containers.map(id => id.substring(0, 12))
        });
        
        for (const containerId of containers) {
          try {
            await execAsync(`docker rm -f ${containerId}`);
            Logger.logError('libreTranslate', `Removed container ${containerId.substring(0, 12)}`, null, {});
          } catch (error) {
            Logger.logError('libreTranslate', `Failed to remove container ${containerId.substring(0, 12)}`, error, {});
          }
        }
      }
    } catch (error) {
      Logger.logError('libreTranslate', 'Error during container cleanup', error, {});
    }
  }

  /**
   * Check if LibreTranslate container exists but is stopped
   * @returns {Promise<{exists: boolean, containerId: string|null}>}
   */
  async getStoppedContainer() {
    try {
      const { stdout } = await execAsync('docker ps -a --filter "name=libretranslate" --format "{{.ID}},{{.Status}}"');
      const lines = stdout.trim().split('\n').filter(line => line);
      
      for (const line of lines) {
        const [id, status] = line.split(',');
        if (status && status.toLowerCase().includes('exited')) {
          return { exists: true, containerId: id };
        }
      }
      
      return { exists: false, containerId: null };
    } catch (error) {
      return { exists: false, containerId: null };
    }
  }

  /**
   * Start LibreTranslate via Docker with retry logic
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<Object>} {success, message, containerId}
   */
  async startLibreTranslate(maxRetries = 3) {
    try {
      // Check if Docker is available
      const dockerAvailable = await this.isDockerAvailable();
      if (!dockerAvailable) {
        this.status = 'docker_not_available';
        return {
          success: false,
          message: 'Docker is not installed. Please install Docker Desktop from https://www.docker.com/get-started',
          status: this.status
        };
      }

      // Check if Docker daemon is running
      const dockerRunning = await this.isDockerRunning();
      if (!dockerRunning) {
        this.status = 'docker_not_running';
        return {
          success: false,
          message: 'Docker is installed but not running. Please start Docker Desktop and try again.',
          status: this.status
        };
      }

      // Check if already running BEFORE cleanup to avoid killing booting containers
      const containerStatus = await this.isContainerRunning();
      
      if (containerStatus.running && !containerStatus.booting) {
        // Container is running and healthy
        this.status = 'running';
        return {
          success: true,
          message: 'LibreTranslate is already running',
          status: this.status
        };
      } else if (containerStatus.booting) {
        // Container is running but still booting - DO NOT KILL IT
        this.status = 'booting';
        Logger.logError('libreTranslate', 'Container is already booting, waiting for it to be ready...', null, {
          containerId: containerStatus.containerId
        });
        
        // Wait for it to finish booting instead of killing it
        return {
          success: true,
          message: 'LibreTranslate is already starting up',
          status: this.status,
          booting: true
        };
      }
      
      // Only clean up stopped/failed containers, not running ones
      await this.cleanupExistingContainers(true);

      // Start new container with retry logic
      this.status = 'starting';
      Logger.logError('libreTranslate', 'Starting LibreTranslate container', null, {});

      let lastError = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Run with minimal configuration for faster startup
          // Load only essential languages to reduce initialization time
          const command = 'docker run -d -p 5001:5000 --name libretranslate ' +
            '-e LT_LOAD_ONLY=en,pt,es,fr,de,it,ja,zh ' +
            '--restart unless-stopped ' +
            'libretranslate/libretranslate:latest';
          const { stdout } = await execAsync(command, { timeout: 120000 }); // 2 min timeout for image pull
          const containerId = stdout.trim();

          Logger.logError('libreTranslate', `Container started (attempt ${attempt}/${maxRetries})`, null, {
            containerId: containerId.substring(0, 12)
          });

          // Wait for container to initialize (with progressive backoff)
          // First run needs more time to download and load language models
          // LibreTranslate takes 30-60 seconds to fully boot on first run
          const waitTime = 30000 + (attempt - 1) * 10000; // 30s, 40s, 50s (increased for model loading)
          Logger.logError('libreTranslate', `Waiting ${waitTime / 1000}s for container to initialize...`, null, {});
          await new Promise(resolve => setTimeout(resolve, waitTime));

          // Verify it's running with retries (reduced frequency: every 10s)
          // Increased attempts for first run when downloading models
          for (let healthAttempt = 1; healthAttempt <= 5; healthAttempt++) {
            const healthCheck = await this.healthCheck();
            
            if (healthCheck.running) {
              this.status = 'running';
              Logger.logError('libreTranslate', 'Container started and verified successfully', null, {
                containerId: containerId.substring(0, 12),
                attempt,
                healthAttempt,
                languageCount: healthCheck.languageCount
              });

              return {
                success: true,
                message: 'LibreTranslate started successfully',
                containerId: containerId.substring(0, 12),
                status: this.status,
                languageCount: healthCheck.languageCount
              };
            }
            
            if (healthAttempt < 5) {
              // Reduced frequency: wait 10 seconds between health checks
              await new Promise(resolve => setTimeout(resolve, 10000));
            }
          }

          // If we get here, health check failed
          lastError = new Error('Health check failed after container start');
          
        } catch (error) {
          lastError = error;
          
          // Check if it's a container name conflict (most common issue)
          if (error.message && (error.message.includes('already in use') || error.message.includes('Conflict'))) {
            Logger.logError('libreTranslate', 'Container name conflict detected, cleaning up...', error, {});
            
            // Clean up any conflicting containers and try again
            await this.cleanupExistingContainers();
            
            // Also check for port conflicts
            if (error.message.includes('port is already allocated')) {
              const portCheck = await this.isPortInUse();
              if (portCheck.inUse) {
                Logger.logError('libreTranslate', `Port 5001 is occupied by process ${portCheck.processId}`, null, {});
              }
            }
          } else {
            Logger.logError('libreTranslate', `Start attempt ${attempt}/${maxRetries} failed`, error, {});
          }
          
          if (attempt < maxRetries) {
            // Exponential backoff: 3s, 6s, 9s
            const delay = 3000 * attempt;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      this.status = 'error';
      return {
        success: false,
        message: `Failed to start LibreTranslate after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
        error: lastError?.message,
        status: this.status
      };

    } catch (error) {
      this.status = 'error';
      Logger.logError('libreTranslate', 'Failed to start container', error, {});

      return {
        success: false,
        message: `Failed to start LibreTranslate: ${error.message}`,
        error: error.message,
        status: this.status
      };
    }
  }

  /**
   * Stop LibreTranslate container
   * @returns {Promise<Object>} {success, message}
   */
  async stopLibreTranslate() {
    try {
      const { stdout } = await execAsync('docker ps --filter "ancestor=libretranslate/libretranslate" --format "{{.ID}}"');
      const containerId = stdout.trim();

      if (!containerId) {
        return {
          success: true,
          message: 'LibreTranslate is not running'
        };
      }

      await execAsync(`docker stop ${containerId}`);
      await execAsync(`docker rm ${containerId}`);

      this.status = 'stopped';
      Logger.logError('libreTranslate', 'Container stopped', null, { containerId });

      return {
        success: true,
        message: 'LibreTranslate stopped successfully',
        containerId
      };
    } catch (error) {
      Logger.logError('libreTranslate', 'Failed to stop container', error, {});

      return {
        success: false,
        message: `Failed to stop LibreTranslate: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get current status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      status: this.status,
      url: this.getEffectiveUrl(),
      languageCount: this.languages.length,
      lastCheck: this.lastCheck
    };
  }

  /**
   * Get detailed container information
   * @returns {Promise<Object>} Container details
   */
  async getContainerInfo() {
    try {
      const containers = await this.getAllLibreTranslateContainers();
      
      if (containers.length === 0) {
        return {
          hasContainers: false,
          count: 0,
          containers: []
        };
      }

      const containerDetails = [];
      for (const id of containers) {
        try {
          const { stdout } = await execAsync(`docker inspect ${id} --format "{{.State.Status}},{{.Name}},{{.Created}}"`);
          const [status, name, created] = stdout.trim().split(',');
          containerDetails.push({
            id: id.substring(0, 12),
            status,
            name: name.replace('/', ''),
            created
          });
        } catch (error) {
          containerDetails.push({
            id: id.substring(0, 12),
            status: 'unknown',
            error: error.message
          });
        }
      }

      return {
        hasContainers: true,
        count: containers.length,
        containers: containerDetails
      };
    } catch (error) {
      return {
        hasContainers: false,
        count: 0,
        error: error.message
      };
    }
  }
}

// Singleton instance
const libreTranslateManager = new LibreTranslateManager();

export default libreTranslateManager;
