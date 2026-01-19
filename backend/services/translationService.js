import axios from 'axios';
import OpenAI from 'openai';
import { translate } from '@vitalets/google-translate-api';
import http from 'http';
import https from 'https';
import { ApiUsage } from '../models/TranslationJob.js';
import Glossary from '../models/Glossary.js';
import Logger from '../utils/logger.js';

class TranslationService {
  constructor(provider, apiKey, options = {}) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.options = options;
    
    if (provider === 'openai') {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async translateWithDeepL(text, sourceLang, targetLang, glossaryTerms = [], html = null) {
    let usePaidEndpoint = false; // Declare outside try block for catch block access
    let url = ''; // Declare outside try block for catch block access
    try {
      // Determine API endpoint based on API key (free vs paid)
      // Paid API keys are typically UUIDs (with dashes), free keys are shorter alphanumeric
      // If key looks like a UUID (has dashes), try paid endpoint first
      const isPaidKey = this.apiKey && this.apiKey.includes('-') && this.apiKey.length > 30;
      url = isPaidKey 
        ? 'https://api.deepl.com/v2/translate'
        : 'https://api-free.deepl.com/v2/translate';
      
      if (isPaidKey) {
        usePaidEndpoint = true;
        console.log('🔑 Detected paid API key, using paid endpoint');
      }
      
      // Normalize language codes for DeepL API
      // DeepL uses: EN, PT (Brazilian), PT-PT (European), ES, FR, DE, IT, etc.
      // Map common language codes to DeepL format
      const languageMap = {
        'en': 'EN',
        'pt': 'PT', // Brazilian Portuguese (default)
        'pt-br': 'PT',
        'pt-pt': 'PT-PT',
        'es': 'ES',
        'fr': 'FR',
        'de': 'DE',
        'it': 'IT',
        'ru': 'RU',
        'ja': 'JA',
        'zh': 'ZH',
        'ar': 'AR'
      };
      
      const normalizedSourceLang = languageMap[sourceLang.toLowerCase()] || sourceLang.toUpperCase();
      const normalizedTargetLang = languageMap[targetLang.toLowerCase()] || targetLang.toUpperCase();
      
      // Validate that source and target are different
      if (normalizedSourceLang === normalizedTargetLang) {
        throw new Error(`Source and target languages cannot be the same: ${normalizedSourceLang}`);
      }
      
      // Log translation parameters for debugging
      console.log(`🌐 DeepL Translation: ${normalizedSourceLang} → ${normalizedTargetLang}`);
      console.log(`   Original codes: ${sourceLang} → ${targetLang}`);
      console.log(`   Text length: ${text.length} chars`);
      
      // Use HTML if available (preserves formatting)
      // According to DeepL docs: https://developers.deepl.com/docs/xml-and-html-handling/html
      const useHtml = html && html.trim().length > 0;
      const inputText = useHtml ? html : text;
      
      // Log HTML usage
      if (useHtml) {
        console.log(`📄 Using HTML formatting for DeepL translation (${html.length} chars)`);
        Logger.logError('translation', 'HTML formatting being used with DeepL', null, {
          htmlLength: html.length,
          textLength: text.length,
          sourceLang: normalizedSourceLang,
          targetLang: normalizedTargetLang
        });
      }
      
      // Log glossary usage
      if (glossaryTerms && glossaryTerms.length > 0) {
        console.log(`📚 Using ${glossaryTerms.length} glossary terms for DeepL translation`);
        Logger.logError('translation', 'Glossary terms being used', null, {
          glossaryCount: glossaryTerms.length,
          sourceLang: normalizedSourceLang,
          targetLang: normalizedTargetLang,
          terms: glossaryTerms.slice(0, 5).map(t => `${t.source_term} → ${t.target_term}`) // Log first 5 terms
        });
      } else {
        console.log(`📚 No glossary terms provided for DeepL translation`);
      }
      
      // Apply glossary replacements using a more robust approach
      // Use a unique marker that's less likely to be translated
      // IMPORTANT: For HTML content, we replace terms in text nodes only, preserving HTML structure
      let preprocessedText = inputText;
      const glossaryMap = new Map();
      
      if (glossaryTerms && glossaryTerms.length > 0) {
        for (let i = 0; i < glossaryTerms.length; i++) {
          const term = glossaryTerms[i];
          // Use a unique placeholder that's unlikely to appear in text
          const placeholder = `__GLOSSARY_TERM_${i}_${Date.now()}__`;
          glossaryMap.set(placeholder, term.target_term);
          
          // Use word boundaries to avoid partial matches
          // Escape special regex characters in source_term
          const escapedTerm = term.source_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // For HTML content, word boundaries should be sufficient since HTML tags
          // don't contain word boundaries. DeepL will handle HTML tags correctly.
          // We use word boundaries to avoid partial matches in both HTML and plain text.
          const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
          preprocessedText = preprocessedText.replace(regex, placeholder);
        }
        console.log(`🔄 Applied ${glossaryTerms.length} glossary replacements (HTML: ${useHtml ? 'Yes' : 'No'})`);
      }
      
      const params = {
        auth_key: this.apiKey,
        text: preprocessedText,
        source_lang: normalizedSourceLang, // Use normalized language code
        target_lang: normalizedTargetLang  // Use normalized language code
      };
      
      // Use formality from options if provided, otherwise use default
      // Formality is available for: DE, FR, IT, JA, ES, NL, PL, PT, RU, ZH
      // Options: 'default', 'more', 'less', 'prefer_more', 'prefer_less'
      if (this.options.formality) {
        params.formality = this.options.formality;
        console.log(`📝 Using formality setting: ${this.options.formality}`);
      }
      
      // Use split_sentences from options if provided
      // Options: '0' (no splitting), '1' (split on punctuation and newlines), 'nonewlines' (split on punctuation only)
      if (this.options.split_sentences !== undefined) {
        params.split_sentences = this.options.split_sentences;
        console.log(`📝 Using split_sentences setting: ${this.options.split_sentences}`);
      }
      
      // Use preserve_formatting from options if provided
      // Options: '0' (normalize), '1' (preserve)
      if (this.options.preserve_formatting !== undefined) {
        params.preserve_formatting = this.options.preserve_formatting;
        console.log(`📝 Using preserve_formatting setting: ${this.options.preserve_formatting}`);
      }
      
      // If using HTML, configure DeepL to preserve formatting
      // Reference: https://developers.deepl.com/docs/xml-and-html-handling/html
      if (useHtml) {
        // Use tag_handling from options if provided, otherwise default to 'html'
        params.tag_handling = this.options.tag_handling || 'html';
        
        // Use split_sentences from options if provided, otherwise default to 'nonewlines' for HTML
        if (!this.options.split_sentences) {
          params.split_sentences = 'nonewlines'; // Preserve HTML structure, split on punctuation only
        }
        
        // Use ignore_tags from options if provided, otherwise use default
        params.ignore_tags = this.options.ignore_tags || 'code,pre,script,style'; // Don't translate code blocks and scripts
        
        console.log(`📄 HTML mode: tag_handling=${params.tag_handling}, split_sentences=${params.split_sentences}, ignore_tags=${params.ignore_tags}`);
      }
      
      // Helper function to create a fresh HTTP agent
      // This is important for retries after network errors to avoid stale connections
      const createAgent = (useKeepAlive = true) => {
        const isHttps = url.startsWith('https://');
        const agentOptions = {
          keepAlive: useKeepAlive,
          keepAliveMsecs: useKeepAlive ? 1000 : 0,
          maxSockets: 50,
          maxFreeSockets: useKeepAlive ? 10 : 0,
          timeout: 90000 // 90 second timeout (increased for better reliability)
        };
        return isHttps 
          ? new https.Agent(agentOptions)
          : new http.Agent(agentOptions);
      };
      
      // Create initial agent with keep-alive for connection reuse
      let agent = createAgent(true);
      
      let response;
      try {
        // Configure axios with better timeout and connection settings
        response = await axios.post(url, null, { 
          params,
          timeout: 90000, // 90 second timeout (increased for better reliability)
          headers: {
            'User-Agent': 'SmartBookTranslator/1.0',
            'Connection': 'keep-alive'
          },
          maxRedirects: 5,
          validateStatus: function (status) {
            return status < 500; // Don't throw for 4xx errors, only 5xx
          },
          [url.startsWith('https://') ? 'httpsAgent' : 'httpAgent']: agent
        });
      } catch (firstError) {
        // If we get 403 on free endpoint, try paid endpoint
        if (firstError.response?.status === 403 && !usePaidEndpoint) {
          console.log('🔄 Free endpoint returned 403, trying paid endpoint...');
          url = 'https://api.deepl.com/v2/translate';
          usePaidEndpoint = true;
          try {
            // Create fresh agent for paid endpoint
            const paidAgent = createAgent(true);
            
            response = await axios.post(url, null, { 
              params,
              timeout: 90000,
              headers: {
                'User-Agent': 'SmartBookTranslator/1.0',
                'Connection': 'keep-alive'
              },
              httpsAgent: paidAgent
            });
            console.log('✅ Paid endpoint successful');
          } catch (paidError) {
            // If paid endpoint also fails, throw the original error with better message
            if (paidError.response?.status === 403) {
              Logger.logConnection('deepl', 'authentication', false, { 
                error: paidError.message,
                triedFree: true,
                triedPaid: true
              });
              throw new Error('Invalid API key or authentication failed. Please check if your API key is for a free or paid plan and ensure it\'s correct.');
            }
            throw paidError;
          }
        } else {
          throw firstError;
        }
      }

      let translatedText = response.data.translations[0].text;
      const detectedLang = response.data.translations[0].detected_source_language;
      
      // Log detected language for debugging
      console.log(`✅ DeepL Response: Detected source language: ${detectedLang}`);
      console.log(`   Requested: ${normalizedSourceLang} → ${normalizedTargetLang}`);
      console.log(`   Endpoint: ${usePaidEndpoint ? 'Paid (api.deepl.com)' : 'Free (api-free.deepl.com)'}`);
      
      // Warn if detected language doesn't match requested source
      if (detectedLang && detectedLang.toUpperCase() !== normalizedSourceLang) {
        console.warn(`⚠️  Language mismatch: Requested ${normalizedSourceLang}, but DeepL detected ${detectedLang}`);
        Logger.logError('translation', 'Language detection mismatch', null, {
          requested: normalizedSourceLang,
          detected: detectedLang,
          target: normalizedTargetLang
        });
      }
      
      // Apply glossary replacements after translation
      // Restore glossary terms from placeholders
      if (glossaryMap.size > 0) {
        for (const [placeholder, targetTerm] of glossaryMap.entries()) {
          const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          translatedText = translatedText.replace(regex, targetTerm);
        }
      }

      // Track usage (use text length, not HTML)
      ApiUsage.track('deepl', text.length, 1);

      return {
        translatedText: useHtml ? null : translatedText, // Return null if HTML was used
        translatedHtml: useHtml ? translatedText : null, // Return HTML if HTML was used
        detectedSourceLang: detectedLang,
        charactersUsed: text.length
      };
    } catch (error) {
      // Log the error with full details
      Logger.logApiError('deepl', 'translate', error, {
        sourceLang,
        targetLang,
        textLength: text.length,
        hasGlossary: glossaryTerms.length > 0,
        url: usePaidEndpoint ? 'https://api.deepl.com/v2/translate' : 'https://api-free.deepl.com/v2/translate'
      });
      
      // Handle network errors (socket hang up, connection reset, timeout)
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || 
          error.message.includes('socket hang up') || error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
        
        // Enhanced logging for network errors
        console.error(`🔴 Network Error Details:`);
        console.error(`   Code: ${error.code || 'N/A'}`);
        console.error(`   Message: ${error.message}`);
        console.error(`   URL: ${url}`);
        console.error(`   Using HTML: ${useHtml}`);
        console.error(`   Text Length: ${text.length}`);
        console.error(`   This may be due to:`);
        console.error(`   - DeepL server temporarily closing connections`);
        console.error(`   - Network instability`);
        console.error(`   - Rate limiting at connection level`);
        console.error(`   - Firewall/proxy interference`);
        
        throw new Error('Network error: Connection failed. Please check your internet connection and try again.');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      } else if (error.response?.status === 403) {
        Logger.logConnection('deepl', 'authentication', false, { error: error.message });
        throw new Error('Invalid API key or authentication failed. If you have a paid DeepL plan, the system will automatically try the paid endpoint.');
      } else if (error.response?.status === 456) {
        throw new Error('Character limit exceeded.');
      }
      throw new Error(`DeepL translation failed: ${error.message}`);
    }
  }

  /**
   * Extract plain text from HTML while preserving structure markers
   * Used for OpenAI translation (which doesn't support HTML tag handling)
   */
  extractTextFromHtml(html) {
    if (!html) return '';
    // Remove HTML tags but preserve structure with markers
    return html
      .replace(/<p[^>]*>/gi, '\n\n') // Paragraphs
      .replace(/<\/p>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n') // Line breaks
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<h[1-6][^>]*>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ') // Remove remaining tags
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize multiple newlines
      .trim();
  }

  async translateWithOpenAI(text, sourceLang, targetLang, glossaryTerms = [], html = null) {
    try {
      // OpenAI doesn't support native HTML/XML tag handling like DeepL
      // Reference: OpenAI API documentation - no structured tag handling available
      // We extract text from HTML and use prompts to preserve formatting
      const useHtml = html && html.trim().length > 0;
      const inputText = useHtml ? this.extractTextFromHtml(html) : text;
      
      let prompt = `Translate the following text from ${sourceLang} to ${targetLang}. 

IMPORTANT: Preserve ALL formatting exactly as it appears:
- Keep all line breaks and paragraph spacing
- Preserve bullet points, dashes, and special characters
- Maintain spacing between words and sentences
- Keep email addresses, phone numbers, and URLs unchanged
- Preserve any special formatting characters
${useHtml ? '- The text was extracted from HTML, so preserve paragraph breaks and structure\n' : ''}\n`;
      
      if (glossaryTerms.length > 0) {
        prompt += `Use these glossary terms:\n`;
        for (const term of glossaryTerms) {
          prompt += `- "${term.source_term}" should be translated as "${term.target_term}"\n`;
        }
        prompt += '\n';
      }
      
      prompt += `Text to translate (preserve formatting exactly):\n${inputText}`;

      const response = await this.openai.chat.completions.create({
        model: this.options.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the text accurately while preserving ALL formatting exactly as it appears, including line breaks, paragraph spacing, special characters, email addresses, phone numbers, and URLs. Do not modify the structure or formatting of the original text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: this.options.maxTokens || 4000
      });

      const translatedText = response.choices[0].message.content;
      
      // Track usage (use original text length, not extracted)
      ApiUsage.track('openai', text.length, 1);

      return {
        translatedText,
        translatedHtml: null, // OpenAI doesn't return HTML, would need reconstruction
        charactersUsed: text.length,
        tokensUsed: response.usage.total_tokens
      };
    } catch (error) {
      // Log the error with full details
      Logger.logApiError('openai', 'translate', error, {
        model: this.options.model || 'gpt-3.5-turbo',
        sourceLang,
        targetLang,
        textLength: text.length,
        hasGlossary: glossaryTerms.length > 0
      });
      
      // Check for rate limit errors (429) - OpenAI SDK may structure errors differently
      const statusCode = error.status || error.statusCode || error.response?.status;
      
      if (statusCode === 429) {
        // Extract rate limit details if available
        const errorMessage = error.message || '';
        let rateLimitMessage = 'Rate limit exceeded. Please wait before retrying.';
        
        // Check for quota/billing issues
        if (errorMessage.includes('quota') || errorMessage.includes('billing') || error.code === 'insufficient_quota') {
          rateLimitMessage = 'You have exceeded your OpenAI quota or billing limit. Please check your OpenAI account billing and add credits. Visit: https://platform.openai.com/account/billing';
        } else if (errorMessage.includes('requests per minute') || errorMessage.includes('RPM')) {
          rateLimitMessage = 'Rate limit exceeded: Too many requests per minute. Please wait 1-2 minutes before retrying.';
        } else if (errorMessage.includes('tokens per minute') || errorMessage.includes('TPM')) {
          rateLimitMessage = 'Rate limit exceeded: Token limit reached. Please wait a few minutes before retrying.';
        } else if (error.response?.data?.error?.message) {
          rateLimitMessage = `Rate limit: ${error.response.data.error.message}`;
        }
        
        throw new Error(rateLimitMessage);
      } else if (statusCode === 401) {
        Logger.logConnection('openai', 'authentication', false, { error: error.message });
        throw new Error('Invalid API key or authentication failed.');
      } else if (statusCode === 404) {
        const model = this.options.model || 'gpt-3.5-turbo';
        if (model.includes('gpt-4')) {
          throw new Error(`The model "${model}" is not available. You may not have access to GPT-4. Try using "gpt-3.5-turbo" instead in Settings.`);
        } else {
          throw new Error(`The model "${model}" does not exist or you do not have access to it. Please check your OpenAI account and model selection.`);
        }
      }
      throw new Error(`OpenAI translation failed: ${error.message || error.toString()}`);
    }
  }

  async translateWithChatGPT(text, sourceLang, targetLang, glossaryTerms = []) {
    // ChatGPT uses the same API as OpenAI
    return this.translateWithOpenAI(text, sourceLang, targetLang, glossaryTerms);
  }

  async translateWithGoogle(text, sourceLang, targetLang, glossaryTerms = []) {
    try {
      // NOTE: Google Translate free API may lose some formatting (line breaks, spacing)
      // For better formatting preservation, use DeepL or ChatGPT
      
      // Preserve line breaks by replacing them with a marker before translation
      const lineBreakMarker = '___LINEBREAK___';
      const doubleLineBreakMarker = '___PARAGRAPH___';
      const preservedText = text
        .replace(/\n\n+/g, doubleLineBreakMarker)
        .replace(/\n/g, lineBreakMarker);
      
      // Apply glossary replacements before translation
      let preprocessedText = preservedText;
      const glossaryMap = new Map();
      
      for (let i = 0; i < glossaryTerms.length; i++) {
        const term = glossaryTerms[i];
        const placeholder = `__GLOSSARY_${i}__`;
        glossaryMap.set(placeholder, term.target_term);
        const escapedTerm = String(term.source_term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
        preprocessedText = preprocessedText.replace(regex, placeholder);
      }

      // Use free Google Translate API
      const result = await translate(preprocessedText, { 
        from: sourceLang, 
        to: targetLang 
      });

      let translatedText = result.text;
      
      // Restore line breaks
      translatedText = translatedText
        .replace(new RegExp(doubleLineBreakMarker, 'g'), '\n\n')
        .replace(new RegExp(lineBreakMarker, 'g'), '\n');
      
      // Apply glossary replacements after translation
      for (const [placeholder, targetTerm] of glossaryMap.entries()) {
        const regex = new RegExp(placeholder, 'g');
        translatedText = translatedText.replace(regex, targetTerm);
      }

      // Track usage (free API, but track for statistics)
      ApiUsage.track('google', text.length, 1);

      return {
        translatedText,
        detectedSourceLang: result.from?.language?.iso || sourceLang,
        charactersUsed: text.length,
        provider: 'Google Translate (Free)'
      };
    } catch (error) {
      // Log the error with full details
      Logger.logApiError('google', 'translate', error, {
        sourceLang,
        targetLang,
        textLength: text.length,
        hasGlossary: glossaryTerms.length > 0,
        errorCode: error.code,
        errorName: error.name
      });
      
      // Handle rate limiting (Google may block after many requests)
      if (error.code === 'BAD_REQUEST' || error.message.includes('Too Many Requests')) {
        throw new Error('Rate limit exceeded. Please wait a few minutes before retrying.');
      } else if (error.code === 'BAD_NETWORK') {
        throw new Error('Network error. Check your internet connection.');
      }
      throw new Error(`Google Translate failed: ${error.message}`);
    }
  }

  async translate(text, sourceLang, targetLang, glossaryTerms = null, html = null) {
    // Get relevant glossary terms if not provided
    // null = retrieve all, empty array [] = use none, array with items = use those
    if (glossaryTerms === null) {
      // null means retrieve all glossary terms from database
      glossaryTerms = Glossary.getAll(sourceLang, targetLang);
      if (glossaryTerms && glossaryTerms.length > 0) {
        console.log(`📚 Retrieved ${glossaryTerms.length} glossary terms from database for ${sourceLang} → ${targetLang}`);
      }
    } else if (Array.isArray(glossaryTerms) && glossaryTerms.length === 0) {
      // Empty array means use no glossary terms
      console.log(`📚 No glossary terms to use (empty array provided)`);
    }
    // If glossaryTerms is an array with items, use it as-is (already filtered)

    switch (this.provider.toLowerCase()) {
      case 'deepl':
        return await this.translateWithDeepL(text, sourceLang, targetLang, glossaryTerms, html);
      case 'openai':
      case 'chatgpt':
        // OpenAI doesn't support native HTML tag handling like DeepL
        // We extract text and use prompts to preserve formatting
        return await this.translateWithOpenAI(text, sourceLang, targetLang, glossaryTerms, html);
      case 'google':
      case 'google-translate':
        // Google Translate doesn't support HTML, use text
        return await this.translateWithGoogle(text, sourceLang, targetLang, glossaryTerms);
      default:
        throw new Error(`Unsupported translation provider: ${this.provider}`);
    }
  }

  async checkLimits() {
    const usage = ApiUsage.getUsageToday(this.provider);
    let apiLimits = {};
    let userSpecific = false;

    try {
      // Try to fetch user-specific limits from the APIs
      if (this.provider.toLowerCase() === 'deepl') {
        // DeepL API - fetch usage from API
        try {
          const response = await axios.get('https://api-free.deepl.com/v2/usage', {
            params: { auth_key: this.apiKey }
          });
          apiLimits = {
            charactersUsed: response.data.character_count,
            charactersLimit: response.data.character_limit,
            percentageUsed: (response.data.character_count / response.data.character_limit * 100).toFixed(2),
            requestsPerMinute: 20 // DeepL limit
          };
          userSpecific = true;
        } catch (err) {
          console.error('Failed to fetch DeepL usage:', err.message);
        }
      } else if (this.provider.toLowerCase() === 'openai' || this.provider.toLowerCase() === 'chatgpt') {
        // OpenAI doesn't provide a simple usage endpoint, use rate limits info
        apiLimits = {
          note: 'OpenAI rate limits vary by model and plan',
          tokensPerMinute: 'Varies by plan (40k-200k TPM)',
          requestsPerMinute: 'Varies by plan (500-5000 RPM)',
            costEstimate: 'GPT-3.5-turbo: ~$0.002/1K tokens, GPT-4: ~$0.06/1K tokens',
          documentation: 'https://platform.openai.com/account/rate-limits'
        };
        userSpecific = false;
      } else if (this.provider.toLowerCase() === 'google' || this.provider.toLowerCase() === 'google-translate') {
        apiLimits = {
          note: 'Free API - No official limits but subject to rate limiting',
          requestsPerMinute: 'Unlimited but may be blocked after heavy use',
          warning: 'For personal use only. Not suitable for commercial applications.',
          recommendation: 'Consider Google Cloud Translation API for commercial use'
        };
        userSpecific = false;
      }
    } catch (error) {
      console.error('Error fetching API limits:', error.message);
    }

    // Default limits if API fetch fails
    if (!userSpecific && Object.keys(apiLimits).length === 0) {
      const defaultLimits = {
        deepl: {
          charactersPerMonth: 500000,
          requestsPerMinute: 20,
          note: 'Free plan limits'
        },
        openai: {
          tokensPerMinute: 90000,
          requestsPerMinute: 3500,
          note: 'Typical plan limits'
        },
        google: {
          note: 'Free API - subject to rate limiting',
          requestsPerMinute: 'unlimited (but may be blocked)',
          warning: 'Not suitable for large-scale commercial use'
        }
      };
      apiLimits = defaultLimits[this.provider.toLowerCase()] || {};
    }

    return {
      provider: this.provider,
      localUsageToday: usage,
      apiLimits,
      userSpecific,
      isNearLimit: apiLimits.percentageUsed ? apiLimits.percentageUsed > 80 : false,
      timestamp: new Date().toISOString()
    };
  }
}

export default TranslationService;

