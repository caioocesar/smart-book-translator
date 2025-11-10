import '../styles/ApiGuideModal.css';

/**
 * ApiGuideModal - Shows detailed guides for getting API credentials
 * Supports: DeepL, OpenAI, Google Translate
 */
function ApiGuideModal({ provider, onClose, t }) {
  const guides = {
    deepl: {
      title: 'DeepL API - How to Get Credentials',
      icon: '🔷',
      steps: [
        {
          title: '1. Create a DeepL Account',
          content: 'Go to DeepL website and create a free account',
          link: 'https://www.deepl.com/pro#developer',
          linkText: 'Open DeepL Pro'
        },
        {
          title: '2. Choose Your Plan',
          content: 'Select the "DeepL API Free" plan (500,000 characters/month) or a paid plan for more usage',
          details: [
            '• Free Plan: 500,000 characters/month',
            '• Pro Plan: Starting at €4.99/month',
            '• No credit card required for Free plan'
          ]
        },
        {
          title: '3. Access Your API Key',
          content: 'Once registered, go to your Account Settings',
          details: [
            '• Click on your profile icon',
            '• Select "Account"',
            '• Navigate to "API Keys" section',
            '• Copy your Authentication Key'
          ]
        },
        {
          title: '4. Use Your API Key',
          content: 'Paste the API key in the "API Key" field in this application',
          note: '⚠️ Keep your API key secure and never share it publicly!'
        }
      ],
      pricing: {
        free: '500,000 characters/month',
        paid: 'Starting at €4.99/month for 1M+ characters',
        note: 'Free plan is perfect for personal book translation'
      },
      links: [
        { text: 'DeepL API Documentation', url: 'https://www.deepl.com/docs-api' },
        { text: 'Pricing Information', url: 'https://www.deepl.com/pro#developer' },
        { text: 'API Usage Dashboard', url: 'https://www.deepl.com/account/usage' }
      ]
    },
    
    openai: {
      title: 'OpenAI API - How to Get Credentials',
      icon: '🤖',
      steps: [
        {
          title: '1. Create an OpenAI Account',
          content: 'Sign up at OpenAI Platform',
          link: 'https://platform.openai.com/signup',
          linkText: 'Sign Up at OpenAI'
        },
        {
          title: '2. Add Payment Method',
          content: 'OpenAI requires a payment method for API access',
          details: [
            '• Go to Billing Settings',
            '• Add a credit card',
            '• Set spending limits to control costs',
            '• Get $5 free credits for new accounts'
          ]
        },
        {
          title: '3. Create API Key',
          content: 'Generate your API key from the dashboard',
          details: [
            '• Go to API Keys section',
            '• Click "Create new secret key"',
            '• Name your key (e.g., "Book Translator")',
            '• Copy and save it immediately (shown only once!)'
          ],
          link: 'https://platform.openai.com/api-keys',
          linkText: 'Manage API Keys'
        },
        {
          title: '4. Use Your API Key',
          content: 'Paste the API key starting with "sk-" in this application',
          note: '⚠️ Never share your API key or commit it to version control!'
        }
      ],
      pricing: {
        model: 'GPT-3.5-turbo (recommended for translation)',
        cost: '~$0.002 per 1,000 tokens',
        estimate: 'A typical novel (~80K words) costs $0.30-$0.50',
        note: 'GPT-4 is more expensive but higher quality'
      },
      links: [
        { text: 'OpenAI Platform', url: 'https://platform.openai.com' },
        { text: 'API Documentation', url: 'https://platform.openai.com/docs' },
        { text: 'Pricing Calculator', url: 'https://openai.com/api/pricing' },
        { text: 'Usage Dashboard', url: 'https://platform.openai.com/usage' }
      ]
    },
    
    google: {
      title: 'Google Translate - Free API',
      icon: '🌐',
      steps: [
        {
          title: '✅ No API Key Required!',
          content: 'Google Translate is available for FREE with no registration',
          details: [
            '• Simply select "Google Translate (Free)" as your provider',
            '• No API key needed',
            '• No credit card required',
            '• Perfect for testing and personal use'
          ]
        },
        {
          title: '⚠️ Limitations',
          content: 'The free API has some limitations',
          details: [
            '• Rate limiting after heavy use',
            '• May be blocked temporarily if overused',
            '• Not suitable for commercial applications',
            '• Translation quality may be lower than paid services'
          ]
        },
        {
          title: '💡 For Commercial Use',
          content: 'Consider Google Cloud Translation API for business use',
          details: [
            '• Higher quality translations',
            '• No rate limits',
            '• Official support',
            '• Pay per character'
          ],
          link: 'https://cloud.google.com/translate',
          linkText: 'Google Cloud Translation'
        }
      ],
      pricing: {
        free: 'Completely FREE!',
        note: 'Best option for personal translation and testing',
        commercial: 'Google Cloud Translation: $20/1M characters'
      },
      links: [
        { text: 'Google Cloud Translation', url: 'https://cloud.google.com/translate' },
        { text: 'Translation API Docs', url: 'https://cloud.google.com/translate/docs' }
      ]
    }
  };

  const guide = guides[provider.toLowerCase()];

  if (!guide) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content api-guide-modal" onClick={(e) => e.stopPropagation()}>
          <h2>Guide not available for {provider}</h2>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content api-guide-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="guide-header">
          <span className="guide-icon">{guide.icon}</span>
          <h2>{guide.title}</h2>
        </div>

        <div className="guide-content">
          {/* Steps */}
          <div className="guide-steps">
            {guide.steps.map((step, index) => (
              <div key={index} className="guide-step">
                <h3>{step.title}</h3>
                <p>{step.content}</p>
                
                {step.details && (
                  <ul className="step-details">
                    {step.details.map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                  </ul>
                )}
                
                {step.link && (
                  <a 
                    href={step.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="step-link"
                  >
                    {step.linkText || 'Learn More'} →
                  </a>
                )}
                
                {step.note && (
                  <div className="step-note">
                    {step.note}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pricing Info */}
          {guide.pricing && (
            <div className="guide-pricing">
              <h3>💰 Pricing Information</h3>
              <div className="pricing-details">
                {guide.pricing.free && (
                  <div className="pricing-item">
                    <strong>Free Plan:</strong> {guide.pricing.free}
                  </div>
                )}
                {guide.pricing.paid && (
                  <div className="pricing-item">
                    <strong>Paid Plans:</strong> {guide.pricing.paid}
                  </div>
                )}
                {guide.pricing.model && (
                  <div className="pricing-item">
                    <strong>Model:</strong> {guide.pricing.model}
                  </div>
                )}
                {guide.pricing.cost && (
                  <div className="pricing-item">
                    <strong>Cost:</strong> {guide.pricing.cost}
                  </div>
                )}
                {guide.pricing.estimate && (
                  <div className="pricing-item estimate">
                    <strong>Estimate:</strong> {guide.pricing.estimate}
                  </div>
                )}
                {guide.pricing.commercial && (
                  <div className="pricing-item">
                    <strong>Commercial:</strong> {guide.pricing.commercial}
                  </div>
                )}
                {guide.pricing.note && (
                  <div className="pricing-note">
                    💡 {guide.pricing.note}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Useful Links */}
          {guide.links && guide.links.length > 0 && (
            <div className="guide-links">
              <h3>🔗 Useful Links</h3>
              <div className="links-list">
                {guide.links.map((link, index) => (
                  <a 
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="guide-link-item"
                  >
                    {link.text} →
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="guide-footer">
          <button onClick={onClose} className="btn-primary btn-large">
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApiGuideModal;


