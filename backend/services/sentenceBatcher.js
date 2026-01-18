/**
 * Sentence Batcher
 * 
 * Optimizes translation by:
 * - Splitting text into sentences
 * - Grouping sentences into batches of ~500-1000 characters
 * - Sending multiple sentences to LibreTranslate at once
 * - Reconstructing text after translation while maintaining order
 * 
 * Uses 'natural' library if available, falls back to regex
 */

// Try to import natural library (optional dependency)
let natural = null;
try {
  natural = await import('natural');
  console.log('✓ Using natural library for advanced sentence tokenization');
} catch (err) {
  console.log('ℹ Using built-in regex for sentence splitting (natural library not available)');
}

class SentenceBatcher {
  constructor(maxBatchSize = 1000) {
    this.maxBatchSize = maxBatchSize;
    this.useNatural = !!natural;
  }

  /**
   * Split text into sentences using natural library or regex fallback
   * @param {string} text - Text to split
   * @returns {Array} Array of sentences
   */
  splitIntoSentences(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // Use natural library if available (more accurate)
    if (this.useNatural && natural) {
      try {
        const tokenizer = new natural.SentenceTokenizer();
        const sentences = tokenizer.tokenize(text);
        return sentences
          .map(s => s.trim())
          .filter(s => s.length > 0);
      } catch (err) {
        console.warn('Natural library failed, falling back to regex:', err.message);
        // Fall through to regex method
      }
    }

    // Fallback: Split on sentence endings followed by space/newline
    // Handles: . ! ? followed by space, newline, or end of string
    // Preserves sentence-ending punctuation with the sentence
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g;
    
    const sentences = text.match(sentenceRegex) || [];
    
    // Clean up sentences (trim whitespace)
    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Group sentences into batches based on character count
   * @param {Array} sentences - Array of sentences
   * @returns {Array} Array of batches, each batch is an array of sentences
   */
  createBatches(sentences) {
    if (!sentences || sentences.length === 0) {
      return [];
    }

    const batches = [];
    let currentBatch = [];
    let currentSize = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      // If adding this sentence would exceed batch size, start a new batch
      if (currentSize + sentenceLength > this.maxBatchSize && currentBatch.length > 0) {
        batches.push([...currentBatch]);
        currentBatch = [];
        currentSize = 0;
      }

      // If a single sentence is longer than max batch size, create a batch with just that sentence
      if (sentenceLength > this.maxBatchSize) {
        if (currentBatch.length > 0) {
          batches.push([...currentBatch]);
          currentBatch = [];
          currentSize = 0;
        }
        batches.push([sentence]);
      } else {
        currentBatch.push(sentence);
        currentSize += sentenceLength;
      }
    }

    // Add remaining sentences as final batch
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Process text into sentence batches
   * @param {string} text - Text to process
   * @returns {Object} {batches, originalSentences, stats}
   */
  processToBatches(text) {
    const sentences = this.splitIntoSentences(text);
    const batches = this.createBatches(sentences);

    const stats = {
      totalSentences: sentences.length,
      totalBatches: batches.length,
      avgSentencesPerBatch: batches.length > 0 
        ? (sentences.length / batches.length).toFixed(2) 
        : 0,
      avgBatchSize: batches.length > 0
        ? (text.length / batches.length).toFixed(0)
        : 0
    };

    console.log(`✓ Batch processing: ${stats.totalSentences} sentences → ${stats.totalBatches} batches (avg ${stats.avgSentencesPerBatch} sentences/batch)`);

    return {
      batches,
      originalSentences: sentences,
      stats
    };
  }

  /**
   * Join translated batches back into text
   * @param {Array} translatedBatches - Array of translated batches
   * @returns {string} Reconstructed text
   */
  reconstructText(translatedBatches) {
    if (!translatedBatches || translatedBatches.length === 0) {
      return '';
    }

    // Flatten batches into sentences
    const allSentences = translatedBatches.flat();

    // Join sentences with appropriate spacing
    // Add space between sentences, preserve paragraph breaks if present
    return allSentences.join(' ').trim();
  }

  /**
   * Convert batches to strings for API
   * @param {Array} batches - Array of sentence batches
   * @returns {Array} Array of batch strings
   */
  batchesToStrings(batches) {
    return batches.map(batch => batch.join(' ').trim());
  }

  /**
   * Convert translated strings back to sentence arrays
   * Attempts to split the translated batch back into the same number of sentences
   * @param {Array} translatedStrings - Array of translated batch strings
   * @param {Array} originalBatches - Original sentence batches for reference
   * @returns {Array} Array of translated sentence batches
   */
  stringsToSentenceBatches(translatedStrings, originalBatches) {
    const result = [];

    for (let i = 0; i < translatedStrings.length; i++) {
      const translatedString = translatedStrings[i];
      const originalBatch = originalBatches[i] || [];
      const expectedSentenceCount = originalBatch.length;

      // Try to split back into the same number of sentences
      const sentences = this.splitIntoSentences(translatedString);

      // If we got the expected number of sentences, use them
      // Otherwise, use the whole translated string as one sentence
      if (sentences.length === expectedSentenceCount) {
        result.push(sentences);
      } else {
        // Log warning and use what we got
        console.warn(`Sentence count mismatch in batch ${i}: expected ${expectedSentenceCount}, got ${sentences.length}`);
        result.push(sentences.length > 0 ? sentences : [translatedString]);
      }
    }

    return result;
  }
}

export default SentenceBatcher;
