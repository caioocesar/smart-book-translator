import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import HtmlDecoder from '../utils/htmlDecoder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentBuilder {
  static async buildPlainText(chunks, outputPath) {
    // If chunks contain HTML, extract text; otherwise use as-is
    const processedChunks = chunks.map(chunk => {
      if (typeof chunk === 'string' && chunk.includes('<')) {
        // Use HtmlDecoder to properly decode all entities and strip HTML
        return HtmlDecoder.decodeAndStripHtml(chunk);
      }
      return chunk;
    });
    const content = processedChunks.join('\n\n');
    fs.writeFileSync(outputPath, content, 'utf-8');
    return outputPath;
  }

  static async buildDOCX(chunks, outputPath) {
    // Check if chunks contain HTML (from DeepL with formatting)
    const hasHtml = chunks.some(chunk => typeof chunk === 'string' && chunk.includes('<'));
    
    // Create a basic DOCX (which is a ZIP file with XML)
    let bodyContent;
    if (hasHtml) {
      // Convert HTML to DOCX paragraphs - preserve basic formatting
      bodyContent = chunks.map(chunk => {
        if (typeof chunk === 'string' && chunk.includes('<')) {
          // Use HtmlDecoder for proper entity decoding
          let text = HtmlDecoder.decodeAndStripHtml(chunk);
          
          // Split into paragraphs for proper DOCX formatting
          const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
          text = paragraphs.join('\n\n');
          return `
    <w:p>
      <w:r>
        <w:t xml:space="preserve">${this.escapeXml(text)}</w:t>
      </w:r>
    </w:p>`;
        } else {
          return `
    <w:p>
      <w:r>
        <w:t xml:space="preserve">${this.escapeXml(chunk)}</w:t>
      </w:r>
    </w:p>`;
        }
      }).join('');
    } else {
      // Plain text
      bodyContent = chunks.map(chunk => `
    <w:p>
      <w:r>
        <w:t xml:space="preserve">${this.escapeXml(chunk)}</w:t>
      </w:r>
    </w:p>`).join('');
    }
    
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyContent}
  </w:body>
</w:document>`;

    // Create temp directory
    const tempDir = path.join(__dirname, '..', 'temp', `docx_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create required DOCX structure
    const wordDir = path.join(tempDir, 'word');
    const relsDir = path.join(tempDir, '_rels');
    const wordRelsDir = path.join(wordDir, '_rels');
    
    fs.mkdirSync(wordDir, { recursive: true });
    fs.mkdirSync(relsDir, { recursive: true });
    fs.mkdirSync(wordRelsDir, { recursive: true });

    // Write document.xml
    fs.writeFileSync(path.join(wordDir, 'document.xml'), xml);

    // Write [Content_Types].xml
    fs.writeFileSync(path.join(tempDir, '[Content_Types].xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    // Write _rels/.rels
    fs.writeFileSync(path.join(relsDir, '.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    // Create ZIP archive
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        fs.rmSync(tempDir, { recursive: true, force: true });
        reject(err);
      });

      archive.pipe(output);
      archive.directory(tempDir, false);
      archive.finalize();
    });
  }

  static async buildPDF(chunks, outputPath) {
    // For PDF generation, we'll create a text file with instructions
    // In a production environment, you'd use a library like PDFKit
    const content = chunks.join('\n\n');
    const txtPath = outputPath.replace('.pdf', '.txt');
    fs.writeFileSync(txtPath, content, 'utf-8');
    
    // Note: Real PDF generation would require additional dependencies
    return txtPath;
  }

  static async buildEPUB(chunks, outputPath, metadata = {}) {
    // Create basic EPUB structure
    const tempDir = path.join(__dirname, '..', 'temp', `epub_${Date.now()}`);
    const metaInfDir = path.join(tempDir, 'META-INF');
    const oebpsDir = path.join(tempDir, 'OEBPS');
    
    fs.mkdirSync(metaInfDir, { recursive: true });
    fs.mkdirSync(oebpsDir, { recursive: true });

    // Write mimetype
    fs.writeFileSync(path.join(tempDir, 'mimetype'), 'application/epub+zip');

    // Write container.xml
    fs.writeFileSync(path.join(metaInfDir, 'container.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    // Write content.opf
    fs.writeFileSync(path.join(oebpsDir, 'content.opf'), `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${metadata.title || 'Translated Document'}</dc:title>
    <dc:creator>${metadata.author || 'Unknown'}</dc:creator>
    <dc:language>${metadata.language || 'en'}</dc:language>
    <dc:identifier id="BookId">urn:uuid:${Date.now()}</dc:identifier>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
  </spine>
</package>`);

    // Check if chunks contain HTML (from DeepL with formatting)
    const hasHtml = chunks.some(chunk => typeof chunk === 'string' && chunk.includes('<'));
    
    // Write chapter1.xhtml - extract text from HTML and format properly for EPUB
    let bodyContent;
    if (hasHtml) {
      // Chunks contain HTML from DeepL - extract text content and format as clean paragraphs
      bodyContent = chunks.map(chunk => {
        if (typeof chunk === 'string' && chunk.includes('<')) {
          // Extract text content from HTML, preserving paragraph structure
          // First, handle nested tags and preserve formatting structure
          let text = chunk
            // Handle italic/emphasis tags - preserve for later
            .replace(/<em[^>]*>/gi, '<em>')
            .replace(/<i[^>]*>/gi, '<i>')
            .replace(/<span[^>]*class="italic"[^>]*>/gi, '<i>')
            // Handle strong/bold tags
            .replace(/<strong[^>]*>/gi, '<strong>')
            .replace(/<b[^>]*>/gi, '<b>')
            // Replace paragraph tags with paragraph markers
            .replace(/<p[^>]*>/gi, '\n\n')
            .replace(/<\/p>/gi, '')
            // Replace line breaks
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<br\s+class="calibre1"[^>]*\/?>/gi, '\n')
            // Remove all other HTML tags except basic formatting
            .replace(/<(?!\/?(?:em|i|strong|b)\b)[^>]+>/g, '');
          
          // Decode HTML entities before processing paragraphs
          text = HtmlDecoder.decode(text);
          
          // Clean up whitespace but preserve paragraph breaks
          text = text
            .replace(/\n\s*\n\s*\n+/g, '\n\n')
            .trim();
          
          // Split into paragraphs and wrap each properly
          const paragraphs = text
            .split(/\n\s*\n/)
            .map(p => {
              let para = p.trim();
              if (!para || para.length === 0) return null;
              
              // Preserve italic/bold formatting if present
              para = para
                .replace(/<em>/gi, '<em>')
                .replace(/<\/em>/gi, '</em>')
                .replace(/<i>/gi, '<em>')
                .replace(/<\/i>/gi, '</em>')
                .replace(/<strong>/gi, '<strong>')
                .replace(/<\/strong>/gi, '</strong>')
                .replace(/<b>/gi, '<strong>')
                .replace(/<\/b>/gi, '</strong>');
              
              // Escape XML but preserve allowed tags
              para = para
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/&lt;(\/?)(em|strong)&gt;/gi, '<$1$2>');
              
              return `<p>${para}</p>`;
            })
            .filter(p => p !== null);
          
          return paragraphs.join('\n  ') || `<p>${this.escapeXml(HtmlDecoder.decode(chunk.replace(/<[^>]+>/g, '')))}</p>`;
        } else {
          // Plain text - escape and wrap in paragraph
          return `<p>${this.escapeXml(chunk)}</p>`;
        }
      }).filter(chunk => chunk && chunk.trim().length > 0).join('\n  ');
    } else {
      // Plain text - escape and wrap in paragraphs
      bodyContent = chunks.map(chunk => `<p>${this.escapeXml(chunk)}</p>`).join('\n  ');
    }
    
    fs.writeFileSync(path.join(oebpsDir, 'chapter1.xhtml'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${metadata.title || 'Translated Document'}</title>
</head>
<body>
  ${bodyContent}
</body>
</html>`);

    // Write toc.ncx
    fs.writeFileSync(path.join(oebpsDir, 'toc.ncx'), `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${Date.now()}"/>
  </head>
  <docTitle>
    <text>${metadata.title || 'Translated Document'}</text>
  </docTitle>
  <navMap>
    <navPoint id="chapter1">
      <navLabel><text>Chapter 1</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`);

    // Create EPUB (ZIP archive)
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        fs.rmSync(tempDir, { recursive: true, force: true });
        reject(err);
      });

      archive.pipe(output);
      
      // Add mimetype first (uncompressed)
      archive.file(path.join(tempDir, 'mimetype'), { name: 'mimetype', store: true });
      archive.directory(metaInfDir, 'META-INF');
      archive.directory(oebpsDir, 'OEBPS');
      
      archive.finalize();
    });
  }

  static async build(chunks, format, outputPath, metadata = {}) {
    switch (format.toLowerCase()) {
      case 'txt':
        return await this.buildPlainText(chunks, outputPath);
      case 'docx':
        return await this.buildDOCX(chunks, outputPath);
      case 'pdf':
        return await this.buildPDF(chunks, outputPath);
      case 'epub':
        return await this.buildEPUB(chunks, outputPath, metadata);
      default:
        throw new Error(`Unsupported output format: ${format}`);
    }
  }

  static escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default DocumentBuilder;



