import axios from 'axios';
import OpenAI from 'openai';
import { translate } from '@vitalets/google-translate-api';
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
    try {
      const url = 'https://api-free.deepl.com/v2/translate';
      
      // Use HTML if available (preserves formatting)
      const useHtml = html && html.trim().length > 0;
      const inputText = useHtml ? html : text;
      
      // Apply glossary replacements before translation
      let preprocessedText = inputText;
      for (const term of glossaryTerms) {
        const regex = new RegExp(term.source_term, 'gi');
        preprocessedText = preprocessedText.replace(regex, `[[${term.source_term}]]`);
      }
      
      const params = {
        auth_key: this.apiKey,
        text: preprocessedText,
        source_lang: sourceLang.toUpperCase(),
        target_lang: targetLang.toUpperCase()
      };
      
      // If using HTML, tell DeepL to preserve tags
      if (useHtml) {
        params.tag_handling = 'xml';
        params.ignore_tags = 'code,pre'; // Preserve code blocks
      }
      
      const response = await axios.post(url, null, { params });

      let translatedText = response.data.translations[0].text;
      
      // Apply glossary replacements after translation
      for (const term of glossaryTerms) {
        const regex = new RegExp(`\\[\\[${term.source_term}\\]\\]`, 'gi');
        translatedText = translatedText.replace(regex, term.target_term);
      }

      // Track usage (use text length, not HTML)
      ApiUsage.track('deepl', text.length, 1);

      return {
        translatedText: useHtml ? null : translatedText, // Return null if HTML was used
        translatedHtml: useHtml ? translatedText : null, // Return HTML if HTML was used
        detectedSourceLang: response.data.translations[0].detected_source_language,
        charactersUsed: text.length
      };
    } catch (error) {
      // Log the error with full details
      Logger.logApiError('deepl', 'translate', error, {
        sourceLang,
        targetLang,
        textLength: text.length,
        hasGlossary: glossaryTerms.length > 0,
        url: 'https://api-free.deepl.com/v2/translate'
      });
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      } else if (error.response?.status === 403) {
        Logger.logConnection('deepl', 'authentication', false, { error: error.message });
        throw new Error('Invalid API key or authentication failed.');
      } else if (error.response?.status === 456) {
        throw new Error('Character limit exceeded.');
      }
      throw new Error(`DeepL translation failed: ${error.message}`);
    }
  }

  async translateWithOpenAI(text, sourceLang, targetLang, glossaryTerms = []) {
    try {
      let prompt = `Translate the following text from ${sourceLang} to ${targetLang}. 

IMPORTANT: Preserve ALL formatting exactly as it appears:
- Keep all line breaks and paragraph spacing
- Preserve bullet points, dashes, and special characters
- Maintain spacing between words and sentences
- Keep email addresses, phone numbers, and URLs unchanged
- Preserve any special formatting characters\n\n`;
      
      if (glossaryTerms.length > 0) {
        prompt += `Use these glossary terms:\n`;
        for (const term of glossaryTerms) {
          prompt += `- "${term.source_term}" should be translated as "${term.target_term}"\n`;
        }
        prompt += '\n';
      }
      
      prompt += `Text to translate (preserve formatting exactly):\n${text}`;

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
      
      // Track usage
      ApiUsage.track('openai', text.length, 1);

      return {
        translatedText,
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
        const regex = new RegExp(term.source_term, 'gi');
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
    if (!glossaryTerms) {
      glossaryTerms = Glossary.getAll(sourceLang, targetLang);
    }

    switch (this.provider.toLowerCase()) {
      case 'deepl':
        return await this.translateWithDeepL(text, sourceLang, targetLang, glossaryTerms, html);
      case 'openai':
      case 'chatgpt':
        // OpenAI doesn't support HTML tag handling like DeepL, use text
        return await this.translateWithOpenAI(text, sourceLang, targetLang, glossaryTerms);
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

