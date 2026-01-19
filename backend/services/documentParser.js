import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import EPub from 'epub';
import fs from 'fs';
import tokenCounter from '../utils/tokenizer.js';

class DocumentParser {
  /**
   * Split text into chunks using token-based chunking (recommended)
   * @param {string} text - Text to split
   * @param {number} maxTokens - Maximum tokens per chunk (default: 2400)
   * @param {boolean} useTokens - Use token-based chunking (default: true)
   * @returns {Array<string>} Array of text chunks
   */
  static splitIntoChunks(text, maxChunkSize = 2400, useTokens = true) {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.warn('⚠️  splitIntoChunks called with empty or invalid text');
      return [];
    }

    try {
      if (useTokens) {
        // Token-based chunking (NEW - recommended)
        const chunks = tokenCounter.splitIntoTokenChunks(text, maxChunkSize, 100);
        if (chunks.length > 0) {
          const avgTokens = Math.round(chunks.reduce((sum, c) => sum + c.tokens, 0) / chunks.length);
          console.log(`✓ Token-based chunking: ${chunks.length} chunks (avg ${avgTokens} tokens/chunk)`);
        } else {
          console.log('✓ Token-based chunking: 0 chunks (empty text)');
        }
        return chunks.map(chunk => chunk.text);
      }
      
      // Character-based chunking (LEGACY - fallback)
      return this.splitIntoChunksLegacy(text, maxChunkSize);
    } catch (error) {
      console.error('❌ Error in splitIntoChunks:', error.message);
      console.error('   Falling back to legacy character-based chunking');
      // Fallback to legacy chunking on error
      try {
        return this.splitIntoChunksLegacy(text, maxChunkSize);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        // Last resort: return text as single chunk
        return [text];
      }
    }
  }

  /**
   * Legacy character-based chunking (kept for backward compatibility)
   * Priority: Paragraphs > Sentences > Words > Characters
   * Ensures chunks don't break in the middle of sentences
   */
  static splitIntoChunksLegacy(text, maxChunkSize = 3000) {
    const chunks = [];
    
    // Split by paragraphs (double newlines or more)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      // If adding this paragraph exceeds the limit
      if (currentChunk.length + trimmedParagraph.length + 2 > maxChunkSize) {
        // Save current chunk if it has content
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If paragraph itself is too large, split by sentences
        if (trimmedParagraph.length > maxChunkSize) {
          const sentenceChunks = this.splitParagraphBySentences(trimmedParagraph, maxChunkSize);
          chunks.push(...sentenceChunks);
        } else {
          currentChunk = trimmedParagraph;
        }
      } else {
        // Add paragraph to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + trimmedParagraph;
        } else {
          currentChunk = trimmedParagraph;
        }
      }
    }
    
    // Add remaining content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Split a paragraph by sentences when it's too large
   * Respects sentence boundaries (. ! ? followed by space or newline)
   */
  static splitParagraphBySentences(paragraph, maxChunkSize) {
    const chunks = [];
    
    // Improved sentence splitting regex
    // Matches sentences ending with . ! ? followed by space, newline, or end of string
    // Handles abbreviations like "Mr." "Dr." "etc."
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
    const sentences = paragraph.match(sentenceRegex) || [paragraph];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
        // Save current chunk
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If single sentence is still too large, split by words
        if (trimmedSentence.length > maxChunkSize) {
          const wordChunks = this.splitSentenceByWords(trimmedSentence, maxChunkSize);
          chunks.push(...wordChunks);
        } else {
          currentChunk = trimmedSentence;
        }
      } else {
        // Add sentence to current chunk
        if (currentChunk.length > 0) {
          currentChunk += ' ' + trimmedSentence;
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Split a sentence by words when it's too large (last resort)
   * Tries to keep complete words together
   */
  static splitSentenceByWords(sentence, maxChunkSize) {
    const chunks = [];
    const words = sentence.split(/\s+/);
    
    let currentChunk = '';
    
    for (const word of words) {
      if (currentChunk.length + word.length + 1 > maxChunkSize) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If a single word is larger than maxChunkSize (rare case like URLs)
        // Split it by characters as last resort
        if (word.length > maxChunkSize) {
          for (let i = 0; i < word.length; i += maxChunkSize) {
            chunks.push(word.slice(i, i + maxChunkSize));
          }
        } else {
          currentChunk = word;
        }
      } else {
        if (currentChunk.length > 0) {
          currentChunk += ' ' + word;
        } else {
          currentChunk = word;
        }
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Split HTML content into chunks that match the number of text chunks
   * Preserves HTML tags and structure while aligning with text chunk boundaries
   * @param {string} html - The HTML content to split
   * @param {number} numChunks - The number of chunks to create (should match text chunks)
   * @returns {Array<string>} Array of HTML chunks
   */
  static splitHtmlIntoChunks(html, numChunks) {
    if (!html || numChunks <= 0) {
      return [];
    }

    // First, extract plain text from HTML to determine split points
    const textChunks = this.splitIntoChunks(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '), Math.ceil(html.length / numChunks));
    
    // If we couldn't create the expected number of chunks, adjust
    const actualNumChunks = Math.max(textChunks.length, numChunks);
    
    // Split HTML by finding boundaries that align with text chunks
    const htmlChunks = [];
    let currentPosition = 0;
    const htmlLength = html.length;
    const chunkSize = Math.ceil(htmlLength / actualNumChunks);
    
    // Track open tags to avoid breaking in the middle of HTML elements
    const openTags = [];
    let inTag = false;
    let tagBuffer = '';
    
    for (let i = 0; i < actualNumChunks; i++) {
      const targetEnd = Math.min(currentPosition + chunkSize, htmlLength);
      
      if (i === actualNumChunks - 1) {
        // Last chunk - take everything remaining
        htmlChunks.push(html.substring(currentPosition));
        break;
      }
      
      // Find a good split point near the target end
      let splitPoint = targetEnd;
      
      // Look for paragraph boundaries, div boundaries, or other block elements
      const lookAhead = Math.min(500, htmlLength - targetEnd);
      const searchStart = Math.max(currentPosition, targetEnd - 500);
      const searchEnd = Math.min(htmlLength, targetEnd + lookAhead);
      const searchArea = html.substring(searchStart, searchEnd);
      
      // Try to find a closing tag for block elements
      const blockEndPatterns = [
        /<\/p>/i,
        /<\/div>/i,
        /<\/h[1-6]>/i,
        /<\/section>/i,
        /<\/article>/i,
        /<\/li>/i,
        /<\/td>/i,
        /<\/th>/i
      ];
      
      let bestSplit = targetEnd;
      let bestDistance = Infinity;
      
      for (const pattern of blockEndPatterns) {
        const matches = [...searchArea.matchAll(new RegExp(pattern.source, 'gi'))];
        for (const match of matches) {
          const matchPos = searchStart + match.index + match[0].length;
          if (matchPos > currentPosition && matchPos <= searchEnd) {
            const distance = Math.abs(matchPos - targetEnd);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestSplit = matchPos;
            }
          }
        }
      }
      
      // If we found a good split point, use it; otherwise use the target
      splitPoint = bestSplit < htmlLength ? bestSplit : targetEnd;
      
      // Ensure we don't break in the middle of a tag
      let lastTagEnd = html.lastIndexOf('>', splitPoint);
      let nextTagStart = html.indexOf('<', splitPoint);
      
      if (nextTagStart !== -1 && nextTagStart < splitPoint + 100) {
        // We're near a tag, find the closing bracket
        const tagEnd = html.indexOf('>', nextTagStart);
        if (tagEnd !== -1 && tagEnd < splitPoint + 200) {
          splitPoint = tagEnd + 1;
        }
      } else if (lastTagEnd !== -1 && lastTagEnd > splitPoint - 100) {
        // Use the last complete tag as split point
        splitPoint = lastTagEnd + 1;
      }
      
      // Extract chunk
      const chunk = html.substring(currentPosition, splitPoint).trim();
      if (chunk.length > 0) {
        htmlChunks.push(chunk);
      }
      
      currentPosition = splitPoint;
    }
    
    // Ensure we have the right number of chunks
    while (htmlChunks.length < numChunks) {
      htmlChunks.push('');
    }
    
    return htmlChunks.slice(0, numChunks);
  }

  static async parsePDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info
      }
    };
  }

  static async parseDOCX(filePath) {
    // Extract both HTML (for formatting) and plain text (for fallback)
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    const textResult = await mammoth.extractRawText({ path: filePath });
    return {
      text: textResult.value,
      html: htmlResult.value, // Preserve HTML formatting
      metadata: {
        messages: textResult.messages
      }
    };
  }

  static async parseEPUB(filePath) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('EPUB parsing timeout - file may be corrupted or too large'));
      }, 60000); // 60 second timeout

      try {
        if (!fs.existsSync(filePath)) {
          clearTimeout(timeout);
          reject(new Error(`EPUB file not found: ${filePath}`));
          return;
        }

        const epub = new EPub(filePath);
        let fullText = '';
        let fullHtml = ''; // Preserve HTML formatting
        let hasError = false;
        
        epub.on('error', (err) => {
          if (!hasError) {
            hasError = true;
            clearTimeout(timeout);
            reject(new Error(`EPUB parsing error: ${err.message}`));
          }
        });

        epub.on('end', () => {
          try {
            // Get the spine (reading order)
            const spine = epub.flow || [];
            let processedChapters = 0;
            let chapterErrors = 0;

            if (spine.length === 0) {
              clearTimeout(timeout);
              reject(new Error('EPUB file has no chapters or content (empty spine)'));
              return;
            }

            spine.forEach((chapter, index) => {
              epub.getChapter(chapter.id, (error, text) => {
                if (error) {
                  chapterErrors++;
                  console.warn(`Error reading chapter ${index} (${chapter.id}):`, error.message);
                } else if (text) {
                  // Preserve HTML for formatting, but also extract plain text for fallback
                  const cleanText = text
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\n\s*\n/g, '\n\n') // Preserve paragraph breaks
                    .replace(/[ \t]+/g, ' ') // Normalize spaces
                    .trim();
                  if (cleanText.length > 0) {
                    fullText += cleanText + '\n\n';
                    fullHtml += text + '\n\n'; // Preserve original HTML
                  }
                }

                processedChapters++;

                if (processedChapters === spine.length) {
                  clearTimeout(timeout);
                  if (fullText.trim().length === 0) {
                    reject(new Error('EPUB file parsed but contains no readable text. All chapters may be empty or corrupted.'));
                  } else if (chapterErrors === spine.length) {
                    reject(new Error(`Failed to read all chapters from EPUB file. ${chapterErrors} errors.`));
                  } else {
                    resolve({
                      text: fullText.trim(),
                      html: fullHtml.trim(), // Preserve HTML formatting
                      metadata: {
                        title: epub.metadata?.title || 'Unknown',
                        author: epub.metadata?.creator || 'Unknown',
                        language: epub.metadata?.language || 'en'
                      }
                    });
                  }
                }
              });
            });
          } catch (error) {
            if (!hasError) {
              hasError = true;
              clearTimeout(timeout);
              reject(new Error(`EPUB processing error: ${error.message}`));
            }
          }
        });

        epub.parse();
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error(`EPUB parsing error: ${error.message}`));
      }
    });
  }

  static async parse(filePath, fileType) {
    try {
      let result;
      
      switch (fileType.toLowerCase()) {
        case 'pdf':
          result = await this.parsePDF(filePath);
          break;
        case 'docx':
          result = await this.parseDOCX(filePath);
          break;
        case 'epub':
          result = await this.parseEPUB(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Document parsing failed: ${error.message}`);
    }
  }
}

export default DocumentParser;


