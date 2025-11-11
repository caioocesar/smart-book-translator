import axios from 'axios';

const API_KEY = 'c7344290-f2ca-48c9-ab19-bc1f7b3803cc';

async function testDeepL() {
  console.log('🧪 Testing DeepL API with your token...\n');
  
  // Test both endpoints
  const endpoints = [
    { name: 'Free Endpoint', url: 'https://api-free.deepl.com/v2/translate' },
    { name: 'Paid Endpoint', url: 'https://api.deepl.com/v2/translate' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing ${endpoint.name}: ${endpoint.url}`);
    
    const params = {
      auth_key: API_KEY,
      text: 'Hello, how are you?',
      source_lang: 'EN',
      target_lang: 'PT'
    };
    
    try {
      const startTime = Date.now();
      const response = await axios.post(endpoint.url, null, { 
        params,
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'SmartBookTranslator/1.0'
        }
      });
      const duration = Date.now() - startTime;
      
      console.log(`✅ SUCCESS! (${duration}ms)`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      console.log(`   Translated: ${response.data.translations[0].text}`);
      console.log(`   Detected language: ${response.data.translations[0].detected_source_language}`);
      
      // Test with HTML
      console.log(`\n📄 Testing with HTML formatting...`);
      const htmlParams = {
        ...params,
        text: '<p>Hello, <strong>how are you?</strong></p>',
        tag_handling: 'html'
      };
      
      const htmlResponse = await axios.post(endpoint.url, null, { 
        params: htmlParams,
        timeout: 30000
      });
      console.log(`✅ HTML test successful!`);
      console.log(`   Translated HTML: ${htmlResponse.data.translations[0].text}`);
      
      break; // If one works, we're done
    } catch (error) {
      if (error.response) {
        console.log(`❌ HTTP Error ${error.response.status}: ${error.response.statusText}`);
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.request) {
        console.log(`❌ Network Error: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        if (error.code === 'ECONNRESET') {
          console.log(`   ⚠️  Connection was reset by server`);
        } else if (error.code === 'ETIMEDOUT') {
          console.log(`   ⚠️  Request timed out`);
        } else if (error.code === 'socket hang up') {
          console.log(`   ⚠️  Socket hang up - connection closed unexpectedly`);
        }
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  // Test with a larger text to see if size is an issue
  console.log(`\n\n📊 Testing with larger text (similar to chunks)...`);
  const largeText = 'The quick brown fox jumps over the lazy dog. '.repeat(50);
  const largeParams = {
    auth_key: API_KEY,
    text: largeText,
    source_lang: 'EN',
    target_lang: 'PT'
  };
  
  try {
    const startTime = Date.now();
    const response = await axios.post('https://api.deepl.com/v2/translate', null, { 
      params: largeParams,
      timeout: 60000, // 60 second timeout for larger text
      headers: {
        'User-Agent': 'SmartBookTranslator/1.0'
      }
    });
    const duration = Date.now() - startTime;
    console.log(`✅ Large text test successful! (${duration}ms)`);
    console.log(`   Text length: ${largeText.length} chars`);
    console.log(`   Response length: ${response.data.translations[0].text.length} chars`);
  } catch (error) {
    console.log(`❌ Large text test failed: ${error.message}`);
    if (error.code) {
      console.log(`   Error code: ${error.code}`);
    }
  }
}

testDeepL().catch(console.error);

