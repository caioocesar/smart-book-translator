/**
 * HTML Entity Decoder
 * 
 * Comprehensive HTML entity decoding for all character types
 * Includes support for Portuguese and other special characters
 */

class HtmlDecoder {
  /**
   * Decode all HTML entities in text
   * @param {string} text - Text with HTML entities
   * @returns {string} Decoded text
   */
  static decode(text) {
    if (!text || typeof text !== 'string') return text;

    // First, decode numeric entities (&#123; and &#xAB; format)
    text = text.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(dec);
    });
    
    text = text.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });

    // Then decode named entities
    const entities = {
      // Basic entities
      'nbsp': '\u00A0',
      'amp': '&',
      'lt': '<',
      'gt': '>',
      'quot': '"',
      'apos': "'",
      '#39': "'",
      
      // Latin letters with diacritics (Portuguese/Spanish/French)
      'aacute': 'á',
      'Aacute': 'Á',
      'acirc': 'â',
      'Acirc': 'Â',
      'agrave': 'à',
      'Agrave': 'À',
      'aring': 'å',
      'Aring': 'Å',
      'atilde': 'ã',
      'Atilde': 'Ã',
      'auml': 'ä',
      'Auml': 'Ä',
      
      'eacute': 'é',
      'Eacute': 'É',
      'ecirc': 'ê',
      'Ecirc': 'Ê',
      'egrave': 'è',
      'Egrave': 'È',
      'euml': 'ë',
      'Euml': 'Ë',
      
      'iacute': 'í',
      'Iacute': 'Í',
      'icirc': 'î',
      'Icirc': 'Î',
      'igrave': 'ì',
      'Igrave': 'Ì',
      'iuml': 'ï',
      'Iuml': 'Ï',
      
      'oacute': 'ó',
      'Oacute': 'Ó',
      'ocirc': 'ô',
      'Ocirc': 'Ô',
      'ograve': 'ò',
      'Ograve': 'Ò',
      'oslash': 'ø',
      'Oslash': 'Ø',
      'otilde': 'õ',
      'Otilde': 'Õ',
      'ouml': 'ö',
      'Ouml': 'Ö',
      
      'uacute': 'ú',
      'Uacute': 'Ú',
      'ucirc': 'û',
      'Ucirc': 'Û',
      'ugrave': 'ù',
      'Ugrave': 'Ù',
      'uuml': 'ü',
      'Uuml': 'Ü',
      
      'yacute': 'ý',
      'Yacute': 'Ý',
      'yuml': 'ÿ',
      
      // Portuguese specific
      'ccedil': 'ç',
      'Ccedil': 'Ç',
      
      // Spanish specific
      'ntilde': 'ñ',
      'Ntilde': 'Ñ',
      
      // Other common characters
      'copy': '\u00A9',
      'reg': '\u00AE',
      'trade': '\u2122',
      'euro': '\u20AC',
      'pound': '\u00A3',
      'yen': '\u00A5',
      'cent': '\u00A2',
      
      // Punctuation
      'mdash': '\u2014',
      'ndash': '\u2013',
      'hellip': '\u2026',
      'lsquo': '\u2018',
      'rsquo': '\u2019',
      'ldquo': '\u201C',
      'rdquo': '\u201D',
      'laquo': '\u00AB',
      'raquo': '\u00BB',
      'bull': '\u2022',
      'middot': '\u00B7',
      'sect': '\u00A7',
      'para': '\u00B6',
      'dagger': '\u2020',
      'Dagger': '\u2021',
      
      // Mathematical
      'times': '\u00D7',
      'divide': '\u00F7',
      'plusmn': '\u00B1',
      'sup1': '\u00B9',
      'sup2': '\u00B2',
      'sup3': '\u00B3',
      'frac14': '\u00BC',
      'frac12': '\u00BD',
      'frac34': '\u00BE',
      
      // Greek letters (common in technical texts)
      'alpha': '\u03B1',
      'Alpha': '\u0391',
      'beta': '\u03B2',
      'Beta': '\u0392',
      'gamma': '\u03B3',
      'Gamma': '\u0393',
      'delta': '\u03B4',
      'Delta': '\u0394',
      'epsilon': '\u03B5',
      'Epsilon': '\u0395',
      'pi': '\u03C0',
      'Pi': '\u03A0',
      'omega': '\u03C9',
      'Omega': '\u03A9'
    };

    // Replace named entities
    return text.replace(/&([a-zA-Z0-9#]+);/g, (match, entity) => {
      return entities[entity] || match;
    });
  }

  /**
   * Decode HTML entities and strip HTML tags
   * @param {string} html - HTML string
   * @returns {string} Clean text without HTML
   */
  static decodeAndStripHtml(html) {
    if (!html || typeof html !== 'string') return html;
    
    let text = html
      // Handle paragraph breaks
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      // Handle line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<br\s+class="[^"]*"[^>]*\/?>/gi, '\n')
      // Remove all HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode entities
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
    
    return this.decode(text);
  }
}

export default HtmlDecoder;
