import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import EPub from 'epub-parser';
import fs from 'fs';

class DocumentParser {
  // Split text into chunks (to respect API limits)
  static splitIntoChunks(text, maxChunkSize = 3000) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If a single paragraph is too large, split it by sentences
        if (paragraph.length > maxChunkSize) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxChunkSize) {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
              }
              // If a single sentence is still too large, force split
              if (sentence.length > maxChunkSize) {
                for (let i = 0; i < sentence.length; i += maxChunkSize) {
                  chunks.push(sentence.slice(i, i + maxChunkSize).trim());
                }
              } else {
                currentChunk = sentence;
              }
            } else {
              currentChunk += sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
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
    const result = await mammoth.extractRawText({ path: filePath });
    return {
      text: result.value,
      metadata: {
        messages: result.messages
      }
    };
  }

  static async parseEPUB(filePath) {
    try {
      const epub = await EPub.parse(filePath);
      let fullText = '';
      
      // Extract text from all sections
      if (epub.sections) {
        for (const section of epub.sections) {
          if (section.htmlString) {
            // Remove HTML tags
            const text = section.htmlString.replace(/<[^>]*>/g, '');
            fullText += text + '\n\n';
          }
        }
      }
      
      return {
        text: fullText,
        metadata: {
          title: epub.metadata?.title || 'Unknown',
          author: epub.metadata?.creator || 'Unknown',
          language: epub.metadata?.language || 'en'
        }
      };
    } catch (error) {
      throw new Error(`EPUB parsing error: ${error.message}`);
    }
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

