/**
 * Validation Response Parser
 * 
 * Parses LLM validation responses to detect:
 * - Positive responses (OK, good, correct, etc.)
 * - Grammar issues with categories ([GENDER], [PLURAL], etc.)
 * - Semantic issues
 */

class ValidationParser {
  /**
   * Check if response indicates translation is OK
   * @param {string} response - Validation response from LLM
   * @returns {boolean} True if response is positive
   */
  isPositiveResponse(response) {
    if (!response || typeof response !== 'string') {
      return false;
    }

    const normalized = response.trim().toLowerCase();
    
    // Empty or very short positive responses
    if (normalized.length < 3) {
      return false;
    }

    // Exact matches
    const exactMatches = ['ok', 'okay', 'good', 'correct', 'fine', 'perfect', 'excellent'];
    if (exactMatches.includes(normalized)) {
      return true;
    }

    // Pattern matching for variations
    const positivePatterns = [
      /^(ok|okay|good|correct|fine|perfect|excellent|accurate)/i,
      /^(looks?\s+(good|fine|correct|okay))/i,
      /^(no\s+issues?)/i,
      /^(no\s+problems?)/i,
      /^(translation\s+is\s+(good|correct|accurate|fine))/i,
      /^(bem\s+traduzido)/i,           // Portuguese: "well translated"
      /^(tradução\s+correta)/i,        // Portuguese: "correct translation"
      /^(está\s+(boa|correta|bem))/i   // Portuguese: "it's good/correct/well"
    ];

    for (const pattern of positivePatterns) {
      if (pattern.test(normalized)) {
        return true;
      }
    }

    // Short response (<20 chars) with positive words
    if (normalized.length < 20) {
      const positiveWords = ['good', 'ok', 'fine', 'correct', 'yes', 'great', 'bem', 'boa', 'correta'];
      const hasPositiveWord = positiveWords.some(word => normalized.includes(word));
      const hasNegativeWord = ['no', 'not', 'issue', 'error', 'problem', 'wrong', 'incorrect'].some(word => normalized.includes(word));
      
      if (hasPositiveWord && !hasNegativeWord) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse validation response into structured issues
   * @param {string} response - Validation response from LLM
   * @returns {Object} Parsed issues with categories
   */
  parseValidationResponse(response) {
    if (!response || typeof response !== 'string') {
      return {
        isOk: false,
        issues: [],
        rawResponse: response
      };
    }

    // Check if response is positive (OK)
    if (this.isPositiveResponse(response)) {
      return {
        isOk: true,
        issues: [],
        rawResponse: response
      };
    }

    // Parse issues from response
    const issues = [];
    const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    for (const line of lines) {
      // Look for categorized issues [TYPE] Description
      const categoryMatch = line.match(/^\[([A-Z_]+)\]\s*(.+)$/i);
      
      if (categoryMatch) {
        const [, type, description] = categoryMatch;
        issues.push({
          type: type.toUpperCase(),
          description: description.trim(),
          severity: this.getSeverityFromType(type)
        });
      } else if (line.match(/^[-*•]\s*/)) {
        // Bullet point without category
        const description = line.replace(/^[-*•]\s*/, '').trim();
        issues.push({
          type: 'GENERAL',
          description,
          severity: 'medium'
        });
      } else if (line.length > 10 && !this.isPositiveResponse(line)) {
        // Long line that might be an issue description
        issues.push({
          type: 'GENERAL',
          description: line,
          severity: 'medium'
        });
      }
    }

    return {
      isOk: issues.length === 0,
      issues,
      rawResponse: response
    };
  }

  /**
   * Get severity level from issue type
   * @private
   */
  getSeverityFromType(type) {
    const typeLower = type.toLowerCase();
    
    if (typeLower.includes('gender') || typeLower.includes('plural')) {
      return 'high';
    } else if (typeLower.includes('mistranslation')) {
      return 'critical';
    } else if (typeLower.includes('variant')) {
      // Language variant mismatch (e.g., European vs Brazilian Portuguese)
      return 'high';
    } else if (typeLower.includes('formality')) {
      // Formality level mismatch
      return 'medium';
    } else if (typeLower.includes('word_order') || typeLower.includes('phrasing')) {
      return 'medium';
    } else {
      return 'medium';
    }
  }

  /**
   * Categorize issues by type
   * @param {Array} issues - Array of issue objects
   * @returns {Object} Issues grouped by type
   */
  categorizeIssues(issues) {
    const categorized = {
      grammar: [],
      semantic: [],
      style: [],
      variant: [],    // NEW: Language variant issues
      formality: [],  // NEW: Formality issues
      other: []
    };

    for (const issue of issues) {
      const type = issue.type.toLowerCase();
      
      if (type.includes('gender') || type.includes('plural') || type.includes('agreement')) {
        categorized.grammar.push(issue);
      } else if (type.includes('mistranslation') || type.includes('meaning')) {
        categorized.semantic.push(issue);
      } else if (type.includes('variant')) {
        categorized.variant.push(issue);
      } else if (type.includes('formality')) {
        categorized.formality.push(issue);
      } else if (type.includes('word_order') || type.includes('phrasing') || type.includes('style')) {
        categorized.style.push(issue);
      } else {
        categorized.other.push(issue);
      }
    }

    return categorized;
  }

  /**
   * Build rewrite instructions from parsed issues
   * @param {Object} parsedResponse - Parsed validation response
   * @returns {string} Instructions for rewrite stage
   */
  buildRewriteInstructions(parsedResponse) {
    if (parsedResponse.isOk || parsedResponse.issues.length === 0) {
      return '';
    }

    const categorized = this.categorizeIssues(parsedResponse.issues);
    let instructions = 'Fix the following specific issues:\n\n';

    if (categorized.grammar.length > 0) {
      instructions += '**Grammar Issues:**\n';
      categorized.grammar.forEach((issue, i) => {
        instructions += `${i + 1}. [${issue.type}] ${issue.description}\n`;
      });
      instructions += '\n';
    }

    // NEW: Language variant issues
    if (categorized.variant.length > 0) {
      instructions += '**Language Variant Issues (CRITICAL):**\n';
      categorized.variant.forEach((issue, i) => {
        instructions += `${i + 1}. [${issue.type}] ${issue.description}\n`;
      });
      instructions += 'NOTE: Ensure Brazilian Portuguese is used throughout (not European Portuguese).\n\n';
    }

    // NEW: Formality issues
    if (categorized.formality.length > 0) {
      instructions += '**Formality Issues:**\n';
      categorized.formality.forEach((issue, i) => {
        instructions += `${i + 1}. [${issue.type}] ${issue.description}\n`;
      });
      instructions += 'NOTE: Adjust tone to match expected formality level.\n\n';
    }

    if (categorized.semantic.length > 0) {
      instructions += '**Translation Issues:**\n';
      categorized.semantic.forEach((issue, i) => {
        instructions += `${i + 1}. [${issue.type}] ${issue.description}\n`;
      });
      instructions += '\n';
    }

    if (categorized.style.length > 0) {
      instructions += '**Style Issues:**\n';
      categorized.style.forEach((issue, i) => {
        instructions += `${i + 1}. [${issue.type}] ${issue.description}\n`;
      });
      instructions += '\n';
    }

    if (categorized.other.length > 0) {
      instructions += '**Other Issues:**\n';
      categorized.other.forEach((issue, i) => {
        instructions += `${i + 1}. ${issue.description}\n`;
      });
      instructions += '\n';
    }

    return instructions.trim();
  }
}

// Singleton instance
const validationParser = new ValidationParser();

export default validationParser;
