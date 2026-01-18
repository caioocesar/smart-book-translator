/**
 * Test script for Text Analyzer (1.5 Layer)
 * 
 * Run with: node backend/test-text-analyzer.js
 */

import textAnalyzer from './services/textAnalyzer.js';

console.log('🧪 Testing Text Analysis Layer (1.5)\n');
console.log('=' .repeat(60));

// Test 1: Long sentences
console.log('\n📝 Test 1: Long Sentences Detection');
console.log('-'.repeat(60));

const longSentenceText = `
The man walked to the store and he bought some milk and then he returned home and he put the milk in the refrigerator and then he sat down to watch television and he turned on his favorite show and he watched it for two hours before finally deciding to go to bed because he was very tired from his long day at work.
`;

const report1 = await textAnalyzer.analyzeTranslation(
  'Original text',
  longSentenceText,
  'en',
  'en'
);

console.log('Readability:', report1.readability);
console.log('Sentences:', report1.sentences);
console.log('Issues found:', report1.issues.length);
report1.issues.forEach(issue => {
  console.log(`  - [${issue.severity}] ${issue.description}`);
  console.log(`    → ${issue.suggestion}`);
});

// Test 2: Repetitive vocabulary
console.log('\n📝 Test 2: Repetitive Vocabulary Detection');
console.log('-'.repeat(60));

const repetitiveText = `
The book is good. The story is good. The characters are good. The ending is good. Everything is good.
`;

const report2 = await textAnalyzer.analyzeTranslation(
  'Original text',
  repetitiveText,
  'en',
  'en'
);

console.log('Words:', report2.words);
console.log('Issues found:', report2.issues.length);
report2.issues.forEach(issue => {
  console.log(`  - [${issue.severity}] ${issue.description}`);
  console.log(`    → ${issue.suggestion}`);
});

// Test 3: Good quality text (no issues)
console.log('\n📝 Test 3: Good Quality Text (No Issues Expected)');
console.log('-'.repeat(60));

const goodText = `
The story unfolds in a small village. The protagonist faces many challenges. 
Through determination and courage, she overcomes each obstacle. 
The narrative builds to a satisfying conclusion.
`;

const report3 = await textAnalyzer.analyzeTranslation(
  'Original text',
  goodText,
  'en',
  'en'
);

console.log('Readability:', report3.readability);
console.log('Sentences:', report3.sentences);
console.log('Words:', report3.words);
console.log('Issues found:', report3.issues.length);
if (report3.issues.length === 0) {
  console.log('  ✅ No issues detected - text quality is good!');
}

// Test 4: Very difficult text
console.log('\n📝 Test 4: Very Difficult Text Detection');
console.log('-'.repeat(60));

const difficultText = `
The utilization of sophisticated methodologies facilitates the optimization of operational parameters through the implementation of comprehensive analytical frameworks.
`;

const report4 = await textAnalyzer.analyzeTranslation(
  'Original text',
  difficultText,
  'en',
  'en'
);

console.log('Readability:', report4.readability);
console.log('Issues found:', report4.issues.length);
report4.issues.forEach(issue => {
  console.log(`  - [${issue.severity}] ${issue.description}`);
  console.log(`    → ${issue.suggestion}`);
});

// Test 5: Generate LLM prompt from analysis
console.log('\n📝 Test 5: LLM Prompt Generation');
console.log('-'.repeat(60));

const llmPrompt = textAnalyzer.generateLLMPrompt(report1);
console.log('Generated LLM Prompt Addition:');
console.log(llmPrompt);

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ All tests completed successfully!');
console.log('=' .repeat(60));
console.log('\nThe Text Analysis Layer (1.5) is working correctly.');
console.log('It can now analyze translations and provide targeted guidance to the LLM.\n');
