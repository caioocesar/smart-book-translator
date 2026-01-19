import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';

/**
 * Token Counter and Chunking Utility
 * Uses tiktoken (OpenAI's tokenizer) for accurate token counting
 */
class TokenCounter {
  constructor() {
    // Initialize tiktoken with cl100k_base encoding (used by GPT-3.5/4, similar to most LLMs)
    this.encoding = new Tiktoken(cl100k_base);
  }

  /**
   * Count tokens in text
   * @param {string} text - Text to count tokens
   * @returns {number} Token count
   */
  countTokens(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }
    try {
      const tokens = this.encoding.encode(text);
      return tokens.length;
    } catch (error) {
      console.error('Error counting tokens:', error);
      // Fallback: rough approximation (4 chars = 1 token)
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Split text into token-based chunks
   * @param {string} text - Text to chunk
   * @param {number} maxTokens - Maximum tokens per chunk (default: 2400)
   * @param {number} overlapTokens - Token overlap between chunks (default: 100)
   * @returns {Array<Object>} Array of chunk objects with text and token count
   */
  splitIntoTokenChunks(text, maxTokens = 2400, overlapTokens = 100) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return [];
    }

    const chunks = [];
    
    // Split by paragraphs first to maintain structure
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length === 0) {
      return [];
    }
    
    let currentChunk = '';
    let currentTokens = 0;
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      const paragraphTokens = this.countTokens(trimmedParagraph);
      
      // If adding this paragraph exceeds the limit
      if (currentTokens + paragraphTokens + 2 > maxTokens) { // +2 for newlines
        // Save current chunk if it has content
        if (currentChunk.trim().length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            tokens: currentTokens
          });
          
          // Start new chunk with overlap (last paragraph or part of it)
          if (overlapTokens > 0) {
            const overlapText = this.getLastNTokens(currentChunk, overlapTokens);
            currentChunk = overlapText + '\n\n';
            currentTokens = this.countTokens(currentChunk);
          } else {
            currentChunk = '';
            currentTokens = 0;
          }
        }
        
        // If paragraph itself is too large, split by sentences
        if (paragraphTokens > maxTokens) {
          const sentenceChunks = this.splitParagraphByTokens(trimmedParagraph, maxTokens, overlapTokens);
          for (const sentenceChunk of sentenceChunks) {
            if (currentTokens + sentenceChunk.tokens <= maxTokens) {
              currentChunk += (currentChunk ? '\n\n' : '') + sentenceChunk.text;
              currentTokens += sentenceChunk.tokens + 2;
            } else {
              if (currentChunk) {
                chunks.push({ text: currentChunk.trim(), tokens: currentTokens });
              }
              currentChunk = sentenceChunk.text;
              currentTokens = sentenceChunk.tokens;
            }
          }
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
          currentTokens += paragraphTokens + (currentChunk === trimmedParagraph ? 0 : 2);
        }
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
        currentTokens += paragraphTokens + (currentChunk === trimmedParagraph ? 0 : 2);
      }
    }
    
    // Add remaining content
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        tokens: currentTokens
      });
    }
    
    return chunks.filter(chunk => chunk.text.length > 0);
  }

  /**
   * Split a paragraph by sentences when it's too large
   * @private
   */
  splitParagraphByTokens(paragraph, maxTokens, overlapTokens = 100) {
    // Split by sentences (. ! ? followed by space or newline)
    const sentenceRegex = /[.!?]+[\s\n]+/g;
    const sentences = [];
    let lastIndex = 0;
    let match;

    while ((match = sentenceRegex.exec(paragraph)) !== null) {
      sentences.push(paragraph.substring(lastIndex, match.index + match[0].length).trim());
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < paragraph.length) {
      sentences.push(paragraph.substring(lastIndex).trim());
    }

    const chunks = [];
    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence);
      
      if (currentTokens + sentenceTokens + 1 > maxTokens) {
        if (currentChunk) {
          chunks.push({ text: currentChunk.trim(), tokens: currentTokens });
          
          // Add overlap
          if (overlapTokens > 0) {
            const overlapText = this.getLastNTokens(currentChunk, overlapTokens);
            currentChunk = overlapText + ' ';
            currentTokens = this.countTokens(currentChunk);
          } else {
            currentChunk = '';
            currentTokens = 0;
          }
        }
        
        // If single sentence is too large, force it as a chunk
        if (sentenceTokens > maxTokens) {
          chunks.push({ text: sentence, tokens: sentenceTokens });
          currentChunk = '';
          currentTokens = 0;
          continue;
        }
      }
      
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      currentTokens += sentenceTokens + (currentChunk === sentence ? 0 : 1);
    }

    if (currentChunk) {
      chunks.push({ text: currentChunk.trim(), tokens: currentTokens });
    }

    return chunks;
  }

  /**
   * Get last N tokens from text
   * @private
   */
  getLastNTokens(text, n) {
    try {
      const tokens = this.encoding.encode(text);
      if (tokens.length <= n) {
        return text;
      }
      const lastTokens = tokens.slice(-n);
      const decoded = this.encoding.decode(lastTokens);
      return decoded;
    } catch (error) {
      // Fallback: use character approximation
      const approxChars = n * 4;
      return text.slice(-approxChars);
    }
  }

  /**
   * Estimate character count from token count
   * @param {number} tokens - Number of tokens
   * @returns {number} Approximate character count
   */
  tokensToChars(tokens) {
    return Math.round(tokens * 4); // Average: 1 token ≈ 4 characters
  }

  /**
   * Estimate token count from character count
   * @param {number} chars - Number of characters
   * @returns {number} Approximate token count
   */
  charsToTokens(chars) {
    return Math.ceil(chars / 4); // Average: 4 characters ≈ 1 token
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.encoding && this.encoding.free) {
      this.encoding.free();
    }
  }
}

// Singleton instance
const tokenCounter = new TokenCounter();

export default tokenCounter;
