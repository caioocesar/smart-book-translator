#!/usr/bin/env node
/**
 * Ollama Model Setup Script
 * Downloads and configures the recommended model for Smart Book Translator
 */

import axios from 'axios';
import readline from 'readline';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const RECOMMENDED_MODEL = 'llama3.2:3b';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(message, colors.cyan);
}

async function checkOllamaStatus() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000
    });
    return { running: true, models: response.data.models || [] };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return { running: false, error: 'Ollama service is not running' };
    }
    return { running: false, error: error.message };
  }
}

async function downloadModel(modelName) {
  log('\n========================================', colors.cyan);
  log(`  Downloading ${modelName}`, colors.cyan);
  log('========================================\n', colors.cyan);
  
  logInfo('This may take several minutes depending on your internet connection...');
  logInfo(`Model size: ~2GB\n`);

  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/pull`,
      { name: modelName },
      {
        timeout: 600000, // 10 minutes
        responseType: 'stream'
      }
    );

    let lastPercent = 0;

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        try {
          const lines = chunk.toString().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            const data = JSON.parse(line);
            
            if (data.status) {
              // Calculate progress
              if (data.total && data.completed) {
                const percent = Math.round((data.completed / data.total) * 100);
                
                // Only update every 5%
                if (percent !== lastPercent && percent % 5 === 0) {
                  process.stdout.write(`\r${colors.cyan}Progress: ${percent}% [${data.status}]${colors.reset}`);
                  lastPercent = percent;
                }
              } else if (data.status === 'success') {
                process.stdout.write('\r' + ' '.repeat(60) + '\r'); // Clear line
                logSuccess('Model downloaded successfully!');
              }
            }
          }
        } catch (parseError) {
          // Ignore JSON parse errors for partial chunks
        }
      });

      response.data.on('end', () => {
        process.stdout.write('\r' + ' '.repeat(60) + '\r'); // Clear line
        resolve({ success: true });
      });

      response.data.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    logError(`Failed to download model: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testModel(modelName) {
  logInfo('\nTesting model...');
  
  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: modelName,
        prompt: 'Say "Hello, I am ready!" in one sentence.',
        stream: false,
        options: {
          temperature: 0.7
        }
      },
      {
        timeout: 30000
      }
    );

    if (response.data.response) {
      logSuccess('Model test successful!');
      logInfo(`  Response: ${response.data.response.trim()}`);
      return true;
    }
    
    return false;
  } catch (error) {
    logError(`Model test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.clear();
  
  log('\n========================================', colors.bright);
  log('  Ollama Model Setup', colors.bright);
  log('  Smart Book Translator', colors.bright);
  log('========================================\n', colors.bright);

  // Step 1: Check Ollama status
  logInfo('Checking Ollama status...');
  const status = await checkOllamaStatus();

  if (!status.running) {
    logError('Ollama service is not running!');
    logWarning('Please start Ollama first:');
    logInfo('  Windows: ollama serve');
    logInfo('  Linux: sudo systemctl start ollama\n');
    process.exit(1);
  }

  logSuccess('Ollama service is running');
  logInfo(`  Found ${status.models.length} installed model(s)\n`);

  // Step 2: Check if recommended model is already installed
  const modelInstalled = status.models.some(m => m.name === RECOMMENDED_MODEL);

  if (modelInstalled) {
    logSuccess(`Model ${RECOMMENDED_MODEL} is already installed!`);
    
    // Ask if user wants to re-download
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('\nDo you want to re-download the model? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      logInfo('\nSetup cancelled.');
      process.exit(0);
    }
  }

  // Step 3: Download model
  const downloadResult = await downloadModel(RECOMMENDED_MODEL);

  if (!downloadResult.success) {
    logError('\nModel download failed!');
    process.exit(1);
  }

  // Step 4: Test model
  const testResult = await testModel(RECOMMENDED_MODEL);

  if (!testResult) {
    logWarning('\nModel downloaded but test failed.');
    logWarning('The model may still work, but please verify manually.');
  }

  // Success!
  log('\n========================================', colors.green);
  log('  Setup Complete!', colors.green);
  log('========================================\n', colors.green);

  logInfo('The model is ready to use in Smart Book Translator.');
  logInfo('You can now enable the LLM enhancement layer in the app.\n');

  logInfo('Model details:');
  logInfo(`  Name: ${RECOMMENDED_MODEL}`);
  logInfo(`  Size: ~2GB`);
  logInfo(`  Speed: Fast (optimized for 3B parameters)`);
  logInfo(`  Quality: Good for translation enhancement\n`);
}

// Run main function
main().catch(error => {
  logError(`\nUnexpected error: ${error.message}`);
  process.exit(1);
});
