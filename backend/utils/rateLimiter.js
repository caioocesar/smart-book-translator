/**
 * Smart Rate Limiter for Translation APIs
 * Dynamically adjusts request delays based on:
 * - API provider characteristics
 * - Recent rate limit errors
 * - Success/failure patterns
 * - Document size and remaining chunks
 * - Time-based factors
 */

class RateLimiter {
  constructor(provider) {
    this.provider = provider.toLowerCase();
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.recentRateLimitErrors = 0;
    this.lastRateLimitTime = null;
    this.requestHistory = []; // Track last 20 requests
    this.baseDelay = this.getBaseDelay();
    this.currentDelay = this.baseDelay;
    this.lastRequestTime = null;
  }

  /**
   * Get base delay for each provider
   */
  getBaseDelay() {
    const delays = {
      'google': 5000,        // 5 seconds - free API is very strict
      'google-translate': 5000,
      'deepl': 3000,         // 3 seconds - 20 req/min limit
      'openai': 2000,       // 2 seconds - varies by plan
      'chatgpt': 2000
    };
    return delays[this.provider] || 3000;
  }

  /**
   * Calculate adaptive delay based on multiple factors
   */
  calculateDelay(chunksRemaining = 0, totalChunks = 0) {
    let delay = this.baseDelay;

    // Factor 1: Provider-specific adjustments
    if (this.provider === 'google' || this.provider === 'google-translate') {
      // Google is very strict - use longer delays
      delay = 5000;
      
      // If we have many chunks remaining, be more conservative
      if (chunksRemaining > 100) {
        delay = 7000; // 7 seconds for large documents
      } else if (chunksRemaining > 50) {
        delay = 6000; // 6 seconds for medium documents
      }
    } else if (this.provider === 'deepl') {
      // DeepL: 20 requests/min = 3 seconds per request
      delay = 3000;
      // Add buffer for safety
      if (chunksRemaining > 50) {
        delay = 3500;
      }
    } else if (this.provider === 'openai' || this.provider === 'chatgpt') {
      // OpenAI: varies by plan, but generally more lenient
      delay = 2000;
      if (chunksRemaining > 100) {
        delay = 2500; // Slightly slower for large batches
      }
    }

    // Factor 2: Recent rate limit errors - increase delay significantly
    if (this.recentRateLimitErrors > 0) {
      const errorMultiplier = 1 + (this.recentRateLimitErrors * 0.5);
      delay = delay * errorMultiplier;
      
      // If we hit rate limit recently, add extra cooldown
      if (this.lastRateLimitTime) {
        const timeSinceError = Date.now() - this.lastRateLimitTime;
        const cooldownMinutes = 5; // 5 minute cooldown period
        if (timeSinceError < cooldownMinutes * 60 * 1000) {
          const cooldownMultiplier = 1 + ((cooldownMinutes * 60 * 1000 - timeSinceError) / (cooldownMinutes * 60 * 1000)) * 0.5;
          delay = delay * cooldownMultiplier;
        }
      }
    }

    // Factor 3: Consecutive failures - increase delay
    if (this.consecutiveFailures > 0) {
      delay = delay * (1 + this.consecutiveFailures * 0.2);
    }

    // Factor 4: Consecutive successes - gradually reduce delay (but not below base)
    if (this.consecutiveSuccesses > 10) {
      const reductionFactor = Math.min(0.3, this.consecutiveSuccesses * 0.02);
      delay = Math.max(this.baseDelay * 0.7, delay * (1 - reductionFactor));
    }

    // Factor 5: Time of day (optional - Google might be stricter during peak hours)
    const hour = new Date().getHours();
    if ((this.provider === 'google' || this.provider === 'google-translate') && 
        (hour >= 9 && hour <= 17)) {
      // Peak hours - add 10% delay
      delay = delay * 1.1;
    }

    // Factor 6: Add random jitter (±10%) to avoid synchronized requests
    const jitter = delay * 0.1 * (Math.random() * 2 - 1); // -10% to +10%
    delay = delay + jitter;

    // Factor 7: Ensure minimum delay based on provider
    const minDelays = {
      'google': 4000,
      'google-translate': 4000,
      'deepl': 2500,
      'openai': 1500,
      'chatgpt': 1500
    };
    delay = Math.max(delay, minDelays[this.provider] || 2000);

    // Factor 8: Cap maximum delay (except after rate limit errors)
    if (this.recentRateLimitErrors === 0) {
      delay = Math.min(delay, this.baseDelay * 3);
    } else {
      // After rate limit, allow longer delays
      delay = Math.min(delay, this.baseDelay * 5);
    }

    this.currentDelay = Math.round(delay);
    return this.currentDelay;
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    
    // Decay recent rate limit errors over time
    if (this.recentRateLimitErrors > 0 && this.consecutiveSuccesses > 5) {
      this.recentRateLimitErrors = Math.max(0, this.recentRateLimitErrors - 1);
    }

    // Track in history (keep last 20)
    this.requestHistory.push({
      time: Date.now(),
      success: true
    });
    if (this.requestHistory.length > 20) {
      this.requestHistory.shift();
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Record a rate limit error
   */
  recordRateLimitError() {
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures++;
    this.recentRateLimitErrors++;
    this.lastRateLimitTime = Date.now();

    // Track in history
    this.requestHistory.push({
      time: Date.now(),
      success: false,
      rateLimit: true
    });
    if (this.requestHistory.length > 20) {
      this.requestHistory.shift();
    }

    // Reset delay to be more conservative
    this.currentDelay = this.baseDelay * 2;
  }

  /**
   * Record a non-rate-limit error
   */
  recordError() {
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures++;
    
    // Track in history
    this.requestHistory.push({
      time: Date.now(),
      success: false,
      rateLimit: false
    });
    if (this.requestHistory.length > 20) {
      this.requestHistory.shift();
    }
  }

  /**
   * Get current success rate from recent history
   */
  getSuccessRate() {
    if (this.requestHistory.length === 0) return 1.0;
    
    const recent = this.requestHistory.slice(-10); // Last 10 requests
    const successes = recent.filter(r => r.success).length;
    return successes / recent.length;
  }

  /**
   * Check if we should pause before making next request
   */
  shouldPause() {
    // If we hit rate limit recently, pause longer
    if (this.lastRateLimitTime) {
      const timeSinceError = Date.now() - this.lastRateLimitTime;
      if (timeSinceError < 60000) { // Less than 1 minute since error
        return true;
      }
    }

    // If success rate is very low, pause
    if (this.getSuccessRate() < 0.5 && this.requestHistory.length >= 5) {
      return true;
    }

    return false;
  }

  /**
   * Get recommended pause duration in milliseconds
   */
  getPauseDuration() {
    if (this.recentRateLimitErrors > 0) {
      // Exponential backoff: 1 min, 2 min, 4 min, etc. (max 10 min)
      return Math.min(600000, 60000 * Math.pow(2, this.recentRateLimitErrors - 1));
    }
    
    if (this.getSuccessRate() < 0.5) {
      return 120000; // 2 minutes if success rate is low
    }

    return 0;
  }

  /**
   * Reset state (useful when switching jobs or providers)
   */
  reset() {
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.recentRateLimitErrors = 0;
    this.lastRateLimitTime = null;
    this.requestHistory = [];
    this.currentDelay = this.baseDelay;
  }

  /**
   * Get status information for logging
   */
  getStatus() {
    return {
      provider: this.provider,
      currentDelay: this.currentDelay,
      baseDelay: this.baseDelay,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      recentRateLimitErrors: this.recentRateLimitErrors,
      successRate: this.getSuccessRate(),
      shouldPause: this.shouldPause(),
      pauseDuration: this.getPauseDuration()
    };
  }
}

export default RateLimiter;

