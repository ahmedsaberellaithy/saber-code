#!/usr/bin/env node

const { OllamaInterface } = require('../index'); // Changed from '../src/core/ollamaInterface'
const chalk = require('chalk');

async function runTests() {
  console.log(chalk.blue.bold('🧪 Running Saber CLI Tests\n'));
  
  const ollama = new OllamaInterface();
  let passed = 0;
  let failed = 0;

  const tests = [
    {
      name: 'Initialization',
      fn: async () => {
        const context = await ollama.initialize();
        if (context && typeof context === 'object') return true;
        throw new Error('Invalid context returned');
      }
    },
    {
      name: 'Complete Method',
      fn: async () => {
        const result = await ollama.complete('Say "Test passed!"');
        if (result && result.completion) return true;
        throw new Error('Invalid completion result');
      }
    },
    {
      name: 'Messages API',
      fn: async () => {
        const result = await ollama.messages.create({
          messages: [{ role: 'user', content: 'Hello' }]
        });
        if (result && result.content) return true;
        throw new Error('Invalid messages result');
      }
    },
    {
      name: 'Context Management',
      fn: async () => {
        const context = ollama.getContext();
        if (context && typeof context === 'object') return true;
        throw new Error('Invalid context');
      }
    }
  ];

  for (const test of tests) {
    try {
      console.log(chalk.blue(`Testing ${test.name}...`));
      await test.fn();
      console.log(chalk.green(`  ✅ ${test.name} - PASS`));
      passed++;
    } catch (error) {
      console.log(chalk.red(`  ❌ ${test.name} - FAIL: ${error.message}`));
      failed++;
    }
  }

  console.log(chalk.blue.bold('\n📊 Test Summary:'));
  console.log(chalk.green(`  Passed: ${passed}`));
  console.log(chalk.red(`  Failed: ${failed}`));
  
  if (failed === 0) {
    console.log(chalk.green.bold('\n🎉 All tests passed!'));
    process.exit(0);
  } else {
    console.log(chalk.red.bold('\n❌ Some tests failed!'));
    process.exit(1);
  }
}

runTests().catch(console.error);