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
   * @returns {Object} {processedText, placeholderMap}
   */
  applyPreProcessing(text, glossaryTerms) {
    if (!text || !glossaryTerms || glossaryTerms.length === 0) {
      return { processedText: text, placeholderMap: new Map() };
    }

    let processedText = text;
    const placeholderMap = new Map();
    const timestamp = Date.now();

    // Sort terms by length (longest first) to avoid partial matches
    const sortedTerms = [...glossaryTerms].sort((a, b) => 
      b.source_term.length - a.source_term.length
    );

    sortedTerms.forEach((term, index) => {
      try {
        const placeholder = `__GLOSSARY_TERM_${index}_${timestamp}__`;
        
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

    for (const [placeholder, termInfo] of placeholderMap.entries()) {
      try {
        // Escape special regex characters in placeholder
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPlaceholder, 'g');
        
        // Count occurrences in translated text
        const matches = (finalText.match(regex) || []).length;
        
        if (matches > 0) {
          finalText = finalText.replace(regex, termInfo.targetTerm);
          restored += matches;
          this.stats.postProcessed++;
        } else {
          notFound++;
          console.warn(`Placeholder not found in translation: ${placeholder} (original: "${termInfo.sourceTerm}")`);
        }
      } catch (error) {
        console.error(`Error post-processing placeholder "${placeholder}":`, error);
        this.stats.failed++;
      }
    }

    console.log(`✓ Post-processing: ${restored} placeholders restored, ${notFound} not found`);

    return { finalText, stats: this.getStatistics() };
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
