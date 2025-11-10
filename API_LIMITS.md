# 📊 API Limits & Pricing (2025)

Complete reference for all translation APIs supported by Smart Book Translator.

## 🆓 Google Translate (Free API)

### Free Tier
- **Cost**: $0
- **Character Limit**: Unlimited (officially)
- **Rate Limits**: Undocumented, varies
- **Typical Limits**: 
  - ~100-200 requests/hour before blocking
  - ~5000 characters per request
  - May block temporarily if overused

### ⚠️ Important Notes
- Not officially supported for commercial use
- Google may block or rate-limit at any time
- No SLA or guarantees
- Best for: Testing, personal occasional use
- **Do NOT use for**: Commercial apps, large-scale translation

### Workaround
- Wait 10-15 minutes if blocked
- Use smaller chunks
- Spread translations over time
- Use VPN if persistently blocked (not recommended)

---

## 💎 DeepL API

### Free Tier
- **Cost**: $0/month
- **Character Limit**: 500,000 characters/month
- **Rate Limits**: 
  - Free: Unknown requests/minute (estimated ~20)
  - No concurrent requests limit

### Pro Tier (Starter)
- **Cost**: €5.99/month
- **Character Limit**: 1,000,000 characters/month
- **Additional**: €25 per 1M characters beyond limit
- **Rate Limits**: Higher than free (exact numbers not published)

### Pro Tier (Advanced)
- **Cost**: €29.99/month  
- **Character Limit**: 5,000,000 characters/month
- **Additional**: €20 per 1M characters
- **Rate Limits**: Even higher

### Pro Tier (Ultimate)
- **Cost**: €99.99/month
- **Character Limit**: 20,000,000 characters/month
- **Additional**: €15 per 1M characters
- **Rate Limits**: Premium limits

### Features by Tier
| Feature | Free | Starter | Advanced | Ultimate |
|---------|------|---------|----------|----------|
| API Access | ✅ | ✅ | ✅ | ✅ |
| Glossary Support | ❌ | ✅ | ✅ | ✅ |
| Formality Control | ❌ | ✅ | ✅ | ✅ |
| Document Translation | ❌ | ✅ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |

### Supported Languages (31)
Bulgarian, Chinese, Czech, Danish, Dutch, English, Estonian, Finnish, French, German, Greek, Hungarian, Indonesian, Italian, Japanese, Korean, Latvian, Lithuanian, Norwegian, Polish, Portuguese, Romanian, Russian, Slovak, Slovenian, Spanish, Swedish, Turkish, Ukrainian

### Rate Limit Errors
- **HTTP 429**: Too many requests - wait and retry
- **HTTP 456**: Character limit exceeded
- **HTTP 403**: Invalid API key

### Best Practices
- Monitor usage in DeepL dashboard
- Set up billing alerts
- Use smaller chunks for better error recovery
- Cache translations to avoid re-translating

### Cost Examples
| Document Size | Free | Starter | Advanced |
|---------------|------|---------|----------|
| 10,000 words (~60k chars) | Free (8% of limit) | Free | Free |
| 100,000 words (~600k chars) | Need Pro | €5.99 | €5.99 |
| 1,000,000 words (~6M chars) | Need Ultimate | €155+ | €49.99 |

**Website**: https://www.deepl.com/pro-api

---

## 🤖 OpenAI API (GPT Models)

### Pricing (Pay-as-you-go)

#### GPT-3.5 Turbo
- **Input**: $0.0005 per 1K tokens (~$0.50 per 1M tokens)
- **Output**: $0.0015 per 1K tokens (~$1.50 per 1M tokens)
- **Context**: Up to 16K tokens
- **Speed**: Fast (~1-2 seconds)

#### GPT-4
- **Input**: $0.03 per 1K tokens (~$30 per 1M tokens)
- **Output**: $0.06 per 1K tokens (~$60 per 1M tokens)
- **Context**: Up to 8K tokens  
- **Speed**: Slower (~5-10 seconds)

#### GPT-4 Turbo
- **Input**: $0.01 per 1K tokens (~$10 per 1M tokens)
- **Output**: $0.03 per 1K tokens (~$30 per 1M tokens)
- **Context**: Up to 128K tokens
- **Speed**: Medium (~2-5 seconds)

#### GPT-4o (Latest - Recommended)
- **Input**: $0.0025 per 1K tokens (~$2.50 per 1M tokens)
- **Output**: $0.01 per 1K tokens (~$10 per 1M tokens)
- **Context**: Up to 128K tokens
- **Speed**: Fast (~2-3 seconds)

### Rate Limits (Tier Based)

#### Free Tier ($0 spent)
- **GPT-3.5**: 3 RPM, 40,000 TPM
- **GPT-4**: 3 RPM, 40,000 TPM
- **Batch Queue**: 100,000 TPD

#### Tier 1 ($5+ spent)
- **GPT-3.5**: 3,500 RPM, 60,000 TPM
- **GPT-4**: 500 RPM, 40,000 TPM

#### Tier 2 ($50+ spent)
- **GPT-3.5**: 3,500 RPM, 80,000 TPM
- **GPT-4**: 5,000 RPM, 80,000 TPM

#### Tier 3 ($100+ spent)
- **GPT-3.5**: 3,500 RPM, 160,000 TPM
- **GPT-4**: 5,000 RPM, 160,000 TPM

#### Tier 4 ($250+ spent)
- **GPT-3.5**: 10,000 RPM, 300,000 TPM
- **GPT-4**: 10,000 RPM, 300,000 TPM

#### Tier 5 ($1000+ spent)
- **GPT-3.5**: 10,000 RPM, 2,000,000 TPM
- **GPT-4**: 10,000 RPM, 450,000 TPM

**RPM** = Requests Per Minute  
**TPM** = Tokens Per Minute  
**TPD** = Tokens Per Day

### Token Estimation
- 1 token ≈ 4 characters (English)
- 1 token ≈ 0.75 words (English)
- 1,000 tokens ≈ 750 words
- 100 words ≈ 133 tokens

### Cost Examples for Translation

| Document Size | GPT-3.5 | GPT-4o | GPT-4 |
|---------------|---------|--------|-------|
| 1,000 words (~1,300 tokens) | $0.003 | $0.016 | $0.117 |
| 10,000 words (~13,000 tokens) | $0.03 | $0.16 | $1.17 |
| 100,000 words (~130,000 tokens) | $0.30 | $1.60 | $11.70 |
| 1,000,000 words (~1.3M tokens) | $3.00 | $16.00 | $117.00 |

**Note**: Includes both input and output tokens (translation doubles token count)

### Supported Languages
95+ languages including:
- All major European languages
- Asian languages (Chinese, Japanese, Korean, etc.)
- Middle Eastern languages (Arabic, Hebrew, etc.)
- African languages
- And many more

### Rate Limit Errors
- **HTTP 429**: Rate limit exceeded - wait and retry
- **HTTP 401**: Invalid API key
- **HTTP 500**: Server error - retry with backoff

### Best Practices
- Start with Tier 1 ($5 minimum)
- Use GPT-3.5 for basic translations (20x cheaper than GPT-4)
- Use GPT-4o for better quality (middle ground)
- Monitor usage in OpenAI dashboard
- Set up spending limits
- Implement exponential backoff for retries

**Website**: https://platform.openai.com/

---

## 📊 Comparison Table

### Cost per 100,000 Words

| Provider | Model | Cost | Quality | Speed |
|----------|-------|------|---------|-------|
| **Google Translate** | Free | $0 | Good | Fast |
| **DeepL** | Free | $0* | Excellent | Fast |
| **DeepL** | Pro Starter | €5.99/mo | Excellent | Fast |
| **OpenAI** | GPT-3.5 | ~$0.30 | Good | Fast |
| **OpenAI** | GPT-4o | ~$1.60 | Excellent | Medium |
| **OpenAI** | GPT-4 | ~$11.70 | Best | Slow |

*Limited to 500k chars/month

### Quality Comparison

| Aspect | Google | DeepL | GPT-3.5 | GPT-4 |
|--------|--------|-------|---------|-------|
| **European Languages** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Asian Languages** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Context Awareness** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Idioms/Slang** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Technical Terms** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Literary Style** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 💡 Recommendations by Use Case

### Testing / Learning
**Best**: Google Translate (Free)
- No cost
- Good enough for testing
- Unlimited (until blocked)

### Personal Occasional Use
**Best**: DeepL Free
- 500k chars/month free
- Excellent quality
- European languages

### Personal Regular Use
**Best**: DeepL Pro Starter (€5.99/mo)
- 1M chars/month
- Great value
- Glossary support

### Fiction / Books
**Best**: GPT-4 or GPT-4o
- Context awareness
- Literary style
- Handles nuance

### Technical Documents
**Best**: DeepL Pro + Glossary
- Terminology consistency
- Technical accuracy
- Fast processing

### Budget Constrained
**Best**: GPT-3.5 Turbo
- Very cheap ($0.003 per 1k words)
- Decent quality
- Fast

### Commercial Use
**Best**: DeepL Pro Advanced or GPT-4o
- Reliable service
- SLA/Support
- Scalable

---

## 📈 Current Usage in App

The app tracks your daily usage:
- Click "🔧 System Status" in header
- Or check "📊 Check API Limits" button
- View characters/tokens used today
- Get warnings when approaching limits

---

## 🔮 Future API Options

Consider adding:
- **Microsoft Translator**: Good for office documents
- **Amazon Translate**: Good for cloud integration
- **Google Cloud Translation**: Official paid version
- **Yandex Translate**: Good for Russian
- **Baidu Translate**: Good for Chinese

---

## ⚖️ Legal Compliance

### Terms of Service Summary

**Google Translate (Free)**:
- ❌ Commercial use prohibited
- ✅ Personal use OK
- ⚠️ No guarantees

**DeepL Free**:
- ❌ Commercial use prohibited  
- ✅ Personal use OK
- ⚠️ 500k chars/month limit

**DeepL Pro**:
- ✅ Commercial use allowed
- ✅ API integration OK
- ❌ Cannot resell raw translations

**OpenAI**:
- ✅ Commercial use allowed
- ✅ Can resell services
- ⚠️ Must comply with usage policies
- ❌ Cannot train competing models

---

**Last Updated**: November 2025  
**Note**: Prices and limits may change. Always check official websites for current rates.

**Sources**:
- https://www.deepl.com/pro-api
- https://platform.openai.com/docs/pricing
- https://cloud.google.com/translate/pricing

