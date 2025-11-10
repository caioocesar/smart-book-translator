import axios from 'axios';
import OpenAI from 'openai';
import translate from '@vitalets/google-translate-api';
import { ApiUsage } from '../models/TranslationJob.js';
import Glossary from '../models/Glossary.js';

class TranslationService {
  constructor(provider, apiKey, options = {}) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.options = options;
    
    if (provider === 'openai') {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async translateWithDeepL(text, sourceLang, targetLang, glossaryTerms = []) {
    try {
      const url = 'https://api-free.deepl.com/v2/translate';
      
      // Apply glossary replacements before translation
      let preprocessedText = text;
      for (const term of glossaryTerms) {
        const regex = new RegExp(term.source_term, 'gi');
        preprocessedText = preprocessedText.replace(regex, `[[${term.source_term}]]`);
      }
      
      const response = await axios.post(url, null, {
        params: {
          auth_key: this.apiKey,
          text: preprocessedText,
          source_lang: sourceLang.toUpperCase(),
          target_lang: targetLang.toUpperCase()
        }
      });

      let translatedText = response.data.translations[0].text;
      
      // Apply glossary replacements after translation
      for (const term of glossaryTerms) {
        const regex = new RegExp(`\\[\\[${term.source_term}\\]\\]`, 'gi');
        translatedText = translatedText.replace(regex, term.target_term);
      }

      // Track usage
      ApiUsage.track('deepl', text.length, 1);

      return {
        translatedText,
        detectedSourceLang: response.data.translations[0].detected_source_language,
        charactersUsed: text.length
      };
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      } else if (error.response?.status === 403) {
        throw new Error('Invalid API key or authentication failed.');
      } else if (error.response?.status === 456) {
        throw new Error('Character limit exceeded.');
      }
      throw new Error(`DeepL translation failed: ${error.message}`);
    }
  }

  async translateWithOpenAI(text, sourceLang, targetLang, glossaryTerms = []) {
    try {
      let prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Maintain the original formatting and structure.\n\n`;
      
      if (glossaryTerms.length > 0) {
        prompt += `Use these glossary terms:\n`;
        for (const term of glossaryTerms) {
          prompt += `- "${term.source_term}" should be translated as "${term.target_term}"\n`;
        }
        prompt += '\n';
      }
      
      prompt += `Text to translate:\n${text}`;

      const response = await this.openai.chat.completions.create({
        model: this.options.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the text accurately while preserving formatting and structure.'
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
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      } else if (error.status === 401) {
        throw new Error('Invalid API key or authentication failed.');
      }
      throw new Error(`OpenAI translation failed: ${error.message}`);
    }
  }

  async translateWithChatGPT(text, sourceLang, targetLang, glossaryTerms = []) {
    // ChatGPT uses the same API as OpenAI
    return this.translateWithOpenAI(text, sourceLang, targetLang, glossaryTerms);
  }

  async translateWithGoogle(text, sourceLang, targetLang, glossaryTerms = []) {
    try {
      // Apply glossary replacements before translation
      let preprocessedText = text;
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
      // Handle rate limiting (Google may block after many requests)
      if (error.code === 'BAD_REQUEST' || error.message.includes('Too Many Requests')) {
        throw new Error('Rate limit exceeded. Please wait a few minutes before retrying.');
      } else if (error.code === 'BAD_NETWORK') {
        throw new Error('Network error. Check your internet connection.');
      }
      throw new Error(`Google Translate failed: ${error.message}`);
    }
  }

  async translate(text, sourceLang, targetLang) {
    // Get relevant glossary terms
    const glossaryTerms = Glossary.getAll(sourceLang, targetLang);

    switch (this.provider.toLowerCase()) {
      case 'deepl':
        return await this.translateWithDeepL(text, sourceLang, targetLang, glossaryTerms);
      case 'openai':
      case 'chatgpt':
        return await this.translateWithOpenAI(text, sourceLang, targetLang, glossaryTerms);
      case 'google':
      case 'google-translate':
        return await this.translateWithGoogle(text, sourceLang, targetLang, glossaryTerms);
      default:
        throw new Error(`Unsupported translation provider: ${this.provider}`);
    }
  }

  async checkLimits() {
    const usage = ApiUsage.getUsageToday(this.provider);
    
    // Define limits per provider (these are example limits, adjust based on your API plan)
    const limits = {
      deepl: {
        charactersPerMonth: 500000,
        requestsPerMinute: 20
      },
      openai: {
        tokensPerMinute: 90000,
        requestsPerMinute: 3500
      },
      google: {
        note: 'Free API - subject to rate limiting by Google',
        requestsPerMinute: 'unlimited (but may be blocked)',
        warning: 'Not suitable for large-scale commercial use'
      }
    };

    const providerLimits = limits[this.provider.toLowerCase()];
    
    return {
      provider: this.provider,
      usage,
      limits: providerLimits,
      isNearLimit: usage.characters_used > (providerLimits?.charactersPerMonth || 0) * 0.8
    };
  }
}

export default TranslationService;

