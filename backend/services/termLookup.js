import axios from 'axios';

/**
 * Term Lookup Service
 * Searches online dictionaries/resources for term translations
 */
class TermLookupService {
  /**
   * Search for term translation online
   * Uses free dictionary APIs
   */
  async searchTerm(term, sourceLanguage, targetLanguage) {
    const results = {
      term,
      sourceLanguage,
      targetLanguage,
      sources: [],
      suggestions: []
    };

    try {
      // Try multiple sources in parallel
      const searches = await Promise.allSettled([
        this.searchWiktionary(term, sourceLanguage, targetLanguage),
        this.searchLibreTranslate(term, sourceLanguage, targetLanguage),
        this.searchMyMemory(term, sourceLanguage, targetLanguage)
      ]);

      searches.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.sources.push(result.value);
          if (result.value.translation) {
            results.suggestions.push({
              translation: result.value.translation,
              source: result.value.source,
              confidence: result.value.confidence || 0.5
            });
          }
        }
      });

      // Sort by confidence
      results.suggestions.sort((a, b) => b.confidence - a.confidence);

      return results;
    } catch (error) {
      console.error('Term lookup error:', error);
      return results;
    }
  }

  /**
   * Search Wiktionary for term definition and translations
   */
  async searchWiktionary(term, sourceLanguage, targetLanguage) {
    try {
      const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(term)}`;
      const response = await axios.get(url, { timeout: 5000 });

      if (response.data && response.data[sourceLanguage]) {
        const definitions = response.data[sourceLanguage];
        return {
          source: 'Wiktionary',
          term,
          definitions: definitions.map(d => d.definition).slice(0, 3),
          url: `https://en.wiktionary.org/wiki/${encodeURIComponent(term)}`
        };
      }
    } catch (error) {
      // Wiktionary doesn't have this term
      return null;
    }
  }

  /**
   * Search MyMemory Translation Memory
   * Free translation API with good coverage
   */
  async searchMyMemory(term, sourceLanguage, targetLanguage) {
    try {
      const url = 'https://api.mymemory.translated.net/get';
      const response = await axios.get(url, {
        params: {
          q: term,
          langpair: `${sourceLanguage}|${targetLanguage}`
        },
        timeout: 5000
      });

      if (response.data && response.data.responseData) {
        const data = response.data.responseData;
        return {
          source: 'MyMemory',
          translation: data.translatedText,
          confidence: data.match || 0.5,
          url: 'https://mymemory.translated.net/'
        };
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Search LibreTranslate (free, open source)
   */
  async searchLibreTranslate(term, sourceLanguage, targetLanguage) {
    try {
      // Note: This requires a LibreTranslate instance
      // Using public instance (may be slow or unavailable)
      const url = 'https://libretranslate.de/translate';
      const response = await axios.post(url, {
        q: term,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text'
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.translatedText) {
        return {
          source: 'LibreTranslate',
          translation: response.data.translatedText,
          confidence: 0.7,
          url: 'https://libretranslate.com/'
        };
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Batch search multiple terms
   */
  async searchMultipleTerms(terms, sourceLanguage, targetLanguage) {
    const results = [];
    
    // Limit concurrent searches to avoid overwhelming APIs
    const batchSize = 3;
    for (let i = 0; i < terms.length; i += batchSize) {
      const batch = terms.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(term => this.searchTerm(term, sourceLanguage, targetLanguage))
      );
      results.push(...batchResults);
      
      // Small delay between batches to be respectful to free APIs
      if (i + batchSize < terms.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

export default new TermLookupService();

