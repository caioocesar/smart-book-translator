import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentBuilder {
  static async buildPlainText(chunks, outputPath) {
    const content = chunks.join('\n\n');
    fs.writeFileSync(outputPath, content, 'utf-8');
    return outputPath;
  }

  static async buildDOCX(chunks, outputPath) {
    // Simple DOCX structure (XML-based)
    const content = chunks.join('\n\n');
    
    // Create a basic DOCX (which is a ZIP file with XML)
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${chunks.map(chunk => `
    <w:p>
      <w:r>
        <w:t xml:space="preserve">${this.escapeXml(chunk)}</w:t>
      </w:r>
    </w:p>
    `).join('')}
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

    // Write chapter1.xhtml
    fs.writeFileSync(path.join(oebpsDir, 'chapter1.xhtml'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${metadata.title || 'Translated Document'}</title>
</head>
<body>
  ${chunks.map(chunk => `<p>${this.escapeXml(chunk)}</p>`).join('\n  ')}
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



