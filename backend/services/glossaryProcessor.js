/**
 * Glossary Processor
 * 
 * Implements hybrid glossary processing for local translation models:
 * - Pre-processing: Replace glossary terms with unique placeholders
 * - Post-processing: Restore placeholders with target translations
 * - Statistics: Track application success rate
 */

class GlossaryProcessor {
  constructor() {
    this.stats = {
      termsApplied: 0,
      preProcessed: 0,
      postProcessed: 0,
      failed: 0,
      placeholderMap: new Map()
    };
  }

  /**
   * Pre-process text: Replace glossary terms with placeholders
   * @param {string} text - Source text
   * @param {Array} glossaryTerms - Array of {source_term, target_term} objects
   * @param {Object} options - { htmlMode?: boolean }
   * @returns {Object} {processedText, placeholderMap}
   */
  applyPreProcessing(text, glossaryTerms, options = {}) {
    if (!text || !glossaryTerms || glossaryTerms.length === 0) {
      return { processedText: text, placeholderMap: new Map() };
    }

    let processedText = text;
    const placeholderMap = new Map();
    const timestamp = Date.now();
    const htmlMode = !!options.htmlMode;

    // Sort terms by length (longest first) to avoid partial matches
    const sortedTerms = [...glossaryTerms].sort((a, b) => 
      b.source_term.length - a.source_term.length
    );

    sortedTerms.forEach((term, index) => {
      try {
        // Use placeholders designed to survive translation.
        // - HTML mode: use HTML comment (LibreTranslate preserves comments).
        // - Text mode: use a stable ASCII token.
        // Use a stable ASCII token even in HTML mode to avoid comment stripping.
        const placeholder = `__GTERM_${index}_${timestamp}__`;
        
        // Escape special regex characters
        const escapedTerm = term.source_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Use word boundaries to avoid partial matches
        // Case-insensitive match
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
        
        // Count matches before replacement
        const matches = (processedText.match(regex) || []).length;
        
        if (matches > 0) {
          processedText = processedText.replace(regex, placeholder);
          
          placeholderMap.set(placeholder, {
            sourceTerm: term.source_term,
            targetTerm: term.target_term,
            matchCount: matches,
            id: term.id
          });
          
          this.stats.preProcessed++;
          this.stats.termsApplied += matches;
        }
      } catch (error) {
        console.error(`Error pre-processing term "${term.source_term}":`, error);
        this.stats.failed++;
      }
    });

    this.stats.placeholderMap = placeholderMap;

    console.log(`✓ Pre-processing: ${this.stats.preProcessed} terms applied (${this.stats.termsApplied} occurrences)`);

    return { processedText, placeholderMap };
  }

  /**
   * Post-process text: Replace placeholders with target terms
   * @param {string} translatedText - Translated text with placeholders
   * @param {Map} placeholderMap - Map of placeholders to target terms
   * @returns {Object} {finalText, stats}
   */
  applyPostProcessing(translatedText, placeholderMap) {
    if (!translatedText || !placeholderMap || placeholderMap.size === 0) {
      return { finalText: translatedText, stats: this.getStatistics() };
    }

    let finalText = translatedText;
    let restored = 0;
    let notFound = 0;

    console.log(`📝 Post-processing input: "${translatedText.substring(0, 200)}..."`);
    console.log(`📝 Looking for ${placeholderMap.size} placeholder(s)`);

    for (const [placeholder, termInfo] of placeholderMap.entries()) {
      try {
        console.log(`  → Searching for: "${placeholder}" → "${termInfo.targetTerm}"`);
        // Backward-compat: older placeholder format used by some in-progress jobs:
        // ⟪GTERM:index:timestamp⟫
        if (typeof placeholder === 'string' && placeholder.startsWith('⟪GTERM:')) {
          const mOld = placeholder.match(/^⟪GTERM:(\d+):\d+⟫$/);
          const idxOld = mOld?.[1];
          if (idxOld) {
            const flexibleOld = new RegExp(`⟪\\s*GTERM\\s*:\\s*${idxOld}\\s*:\\s*\\d+\\s*⟫`, 'g');
            const matchesOld = (finalText.match(flexibleOld) || []).length;
            if (matchesOld > 0) {
              finalText = finalText.replace(flexibleOld, termInfo.targetTerm);
              restored += matchesOld;
              this.stats.postProcessed++;
              console.log(`✓ Restored placeholder with flexible matching: GTERM:${idxOld}:* → "${termInfo.targetTerm}"`);
              continue;
            }
            const looseOld = new RegExp(`GTERM\\s*[:]\\s*${idxOld}\\s*[:]\\s*\\d+`, 'g');
            const looseOldMatches = (finalText.match(looseOld) || []).length;
            if (looseOldMatches > 0) {
              finalText = finalText.replace(looseOld, termInfo.targetTerm);
              restored += looseOldMatches;
              this.stats.postProcessed++;
              console.log(`✓ Restored placeholder with loose matching: GTERM:${idxOld}:* → "${termInfo.targetTerm}"`);
              continue;
            }
          }
        }

        // If we used HTML comment placeholders, match them (with optional whitespace).
        if (typeof placeholder === 'string' && placeholder.startsWith('<!--GTERM:')) {
          const idxMatch = placeholder.match(/<!--GTERM:(\d+):\d+-->/);
          const idx = idxMatch?.[1];
          if (idx) {
            // Match comment with flexible whitespace
            const commentRegex = new RegExp(
              `<!--\\s*GTERM\\s*:\\s*${idx}\\s*:\\s*\\d+\\s*-->`,
              'gi'
            );
            const commentMatches = (finalText.match(commentRegex) || []).length;
            if (commentMatches > 0) {
              finalText = finalText.replace(commentRegex, termInfo.targetTerm);
              restored += commentMatches;
              this.stats.postProcessed++;
              continue;
            }
          }
        }

        // Escape special regex characters in placeholder
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Try exact match first
        let regex = new RegExp(escapedPlaceholder, 'g');
        let matches = (finalText.match(regex) || []).length;
        
        if (matches > 0) {
          finalText = finalText.replace(regex, termInfo.targetTerm);
          restored += matches;
          this.stats.postProcessed++;
        } else {
          // Placeholder might have been altered - try flexible matching.
          // For __GTERM_index_timestamp__, match the same index with any timestamp.
          const m = typeof placeholder === 'string' ? placeholder.match(/^__GTERM_(\d+)_\d+__$/) : null;
          const idx = m?.[1];
          const flexibleRegex = idx ? new RegExp(`__GTERM_${idx}_\\d+__`, 'g') : null;
          matches = flexibleRegex ? (finalText.match(flexibleRegex) || []).length : 0;
          
          if (matches > 0) {
            finalText = finalText.replace(flexibleRegex, termInfo.targetTerm);
            restored += matches;
            this.stats.postProcessed++;
            console.log(`✓ Restored placeholder with flexible matching: GTERM:${idx}:* → "${termInfo.targetTerm}"`);
          } else {
            // Extra fallback: placeholder might have had brackets changed (<< >>) or removed.
            const looseRegex = idx ? new RegExp(`GTERM[\\W_]*${idx}[\\W_]*\\d+`, 'g') : null;
            const looseMatches = looseRegex ? (finalText.match(looseRegex) || []).length : 0;
            if (looseMatches > 0) {
              finalText = finalText.replace(looseRegex, termInfo.targetTerm);
              restored += looseMatches;
              this.stats.postProcessed++;
              console.log(`✓ Restored placeholder with loose matching: GTERM:${idx}:* → "${termInfo.targetTerm}"`);
              continue;
            }

            // Last resort: just replace the source term directly if it appears
            const sourceRegex = new RegExp(`\\b${termInfo.sourceTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            const sourceMatches = (finalText.match(sourceRegex) || []).length;
            
            if (sourceMatches > 0) {
              finalText = finalText.replace(sourceRegex, termInfo.targetTerm);
              restored += sourceMatches;
              this.stats.postProcessed++;
              console.log(`✓ Restored by replacing source term directly: "${termInfo.sourceTerm}" → "${termInfo.targetTerm}"`);
            } else {
              notFound++;
              console.warn(`⚠️ Placeholder not found in translation: ${placeholder} (original: "${termInfo.sourceTerm}") - glossary term may not have been applied`);
            }
          }
        }
      } catch (error) {
        console.error(`Error post-processing placeholder "${placeholder}":`, error);
        this.stats.failed++;
      }
    }

    if (restored > 0) {
      console.log(`✓ Post-processing: ${restored} placeholders restored${notFound > 0 ? `, ${notFound} not found` : ''}`);
    } else if (notFound > 0) {
      console.warn(`⚠️ Post-processing: No placeholders restored, ${notFound} not found`);
    }

    return { finalText, stats: this.getStatistics() };
  }

  /**
   * Enforce glossary terms in text (best-effort).
   * @param {string} text
   * @param {Array} glossaryTerms
   * @returns {string}
   */
  enforceGlossaryTerms(text, glossaryTerms) {
    if (!text || !Array.isArray(glossaryTerms) || glossaryTerms.length === 0) return text;
    
    console.log(`🔧 Enforcing ${glossaryTerms.length} glossary term(s)...`);
    console.log(`  Input: "${text.substring(0, 200)}..."`);
    
    const hasHtmlTags = /<[^>]+>/.test(text);
    const replaceOutsideTags = (input, regex, replacement) => {
      if (!hasHtmlTags) return input.replace(regex, replacement);
      return input
        .split(/(<[^>]+>)/g)
        .map(part => (part.startsWith('<') && part.endsWith('>') ? part : part.replace(regex, replacement)))
        .join('');
    };

    let out = text;
    let totalReplacements = 0;
    for (const term of glossaryTerms) {
      const source = term?.source_term;
      const target = term?.target_term;
      if (!source || !target) continue;
      const escaped = String(source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const beforeLength = out.length;
      out = replaceOutsideTags(out, regex, target);
      if (out.length !== beforeLength || !out.includes(source)) {
        const matches = (text.match(regex) || []).length;
        if (matches > 0) {
          console.log(`  ✓ Enforced: "${source}" → "${target}" (${matches} occurrence(s))`);
          totalReplacements += matches;
        }
      }
    }
    
    if (totalReplacements > 0) {
      console.log(`✓ Glossary enforcement: ${totalReplacements} term(s) applied`);
    } else {
      console.log(`⚠️ Glossary enforcement: No terms found to replace in text`);
    }
    
    return out;
  }

  /**
   * Cleanup any leftover glossary tokens (best-effort).
   * Replace residual GTERM tokens with the ORIGINAL source term to avoid leaking tags.
   * @param {string} translatedText
   * @param {Map} placeholderMap
   * @returns {string}
   */
  applyResidualTokenCleanup(translatedText, placeholderMap) {
    if (!translatedText || !placeholderMap || placeholderMap.size === 0) {
      return translatedText;
    }

    console.log(`🧹 Residual cleanup input: "${translatedText.substring(0, 200)}..."`);
    
    const indexToSource = new Map();
    const extractIndex = (placeholder) => {
      if (typeof placeholder !== 'string') return null;
      let match = placeholder.match(/__GTERM_(\d+)_\d+__/);
      if (match?.[1]) return match[1];
      match = placeholder.match(/<!--\s*GTERM\s*:\s*(\d+)\s*:\s*\d+\s*-->/);
      if (match?.[1]) return match[1];
      match = placeholder.match(/^⟪\s*GTERM\s*:\s*(\d+)\s*:\s*\d+\s*⟫$/);
      if (match?.[1]) return match[1];
      return null;
    };

    for (const [placeholder, termInfo] of placeholderMap.entries()) {
      const idx = extractIndex(placeholder);
      if (idx && termInfo?.sourceTerm) {
        indexToSource.set(String(idx), termInfo.sourceTerm);
      }
    }

    if (indexToSource.size === 0) return translatedText;

    const tokenRegex = new RegExp(
      [
        '__GTERM_(\\d+)_\\d+__',                        // __GTERM_0_123456__
        '<!--\\s*GTERM\\s*:\\s*(\\d+)\\s*:\\s*\\d+\\s*-->', // <!-- GTERM:0:123456 -->
        '⟪\\s*GTERM\\s*:\\s*(\\d+)\\s*:\\s*\\d+\\s*⟫', // ⟪GTERM:0:123456⟫
        '\\bGTERM\\s*[:_]\\s*(\\d+)\\s*[:_]\\s*\\d+',  // GTERM:0:123456 or GTERM_0_123456
        '\\bGTERM\\s+(\\d+)\\s+\\d+',                   // GTERM 0 123456
        'GTERM[\\W_]*(\\d+)[\\W_]*\\d+',                // GTERM-0-123456, GTERM.0.123456, etc.
        '\\bGTERM\\b'                                    // Any remaining "GTERM" word (no capture group)
      ].join('|'),
      'gi'  // Case insensitive
    );

    const cleaned = translatedText.replace(tokenRegex, (...args) => {
      const groups = args.slice(1, 8);  // Now we have 7 capture groups (6 with index + 1 without)
      const idx = groups.find(Boolean);
      const sourceTerm = idx ? indexToSource.get(String(idx)) : null;
      const match = args[0];
      
      // If we matched "GTERM" without an index, try to replace with the first term as fallback
      if (!idx && match.match(/\bGTERM\b/i)) {
        const firstTerm = indexToSource.values().next().value;
        console.log(`  🧹 Found residual token (no index): "${match}" → "${firstTerm || '(removed)'}"`);
        return firstTerm || '';
      }
      
      console.log(`  🧹 Found residual token: "${match}" → "${sourceTerm || '(removed)'}"`);
      return sourceTerm || '';
    });
    
    if (cleaned !== translatedText) {
      console.log(`✓ Residual cleanup: removed/replaced ${(translatedText.match(tokenRegex) || []).length} token(s)`);
    }
    
    return cleaned;
  }

  /**
   * Get processing statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      termsApplied: this.stats.termsApplied,
      preProcessed: this.stats.preProcessed,
      postProcessed: this.stats.postProcessed,
      failed: this.stats.failed,
      successRate: this.stats.termsApplied > 0 
        ? (this.stats.postProcessed / this.stats.preProcessed * 100).toFixed(2) 
        : 100
    };
  }

  /**
   * Reset statistics
   */
  reset() {
    this.stats = {
      termsApplied: 0,
      preProcessed: 0,
      postProcessed: 0,
      failed: 0,
      placeholderMap: new Map()
    };
  }
}

export default GlossaryProcessor;
