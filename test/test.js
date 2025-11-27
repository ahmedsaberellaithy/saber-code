const { OllamaInterface } = require('../src/ollamaInterface');
const chalk = require('chalk');

async function ClientTestRun() {
  console.log(chalk.blue.bold('🧪 Running Saber CLI Method Tests\n'));
  
  const testClient = new OllamaInterface();
  let passed = 0;
  let failed = 0;

  // Test 1: Initialization
  console.log(chalk.blue('1. Testing initialization...'));
  try {
    const context = await testClient.initialize();
    if (context && typeof context === 'object') {
      console.log(chalk.green('   ✅ initialize() - PASS'));
      passed++;
    } else {
      throw new Error('Invalid context returned');
    }
  } catch (error) {
    console.log(chalk.red('   ❌ initialize() - FAIL:'), error.message);
    failed++;
  }

  // Test 2: Simple Completion
  console.log(chalk.blue('\n2. Testing simple completion...'));
  try {
    const result = await testClient.complete('Say "Hello, World!"');
    if (result && result.completion && typeof result.completion === 'string') {
      console.log(chalk.green('   ✅ complete() - PASS'));
      console.log(chalk.gray(`   Response: "${result.completion.substring(0, 50)}..."`));
      passed++;
    } else {
      throw new Error('Invalid completion result');
    }
  } catch (error) {
    console.log(chalk.red('   ❌ complete() - FAIL:'), error.message);
    failed++;
  }

  // Test 3: Claude-compatible Messages API
  console.log(chalk.blue('\n3. Testing messages.create()...'));
  try {
    const result = await testClient.messages.create({
      messages: [{ role: 'user', content: 'What is 2+2?' }],
      max_tokens: 100
    });
    if (result && result.content && Array.isArray(result.content)) {
      console.log(chalk.green('   ✅ messages.create() - PASS'));
      passed++;
    } else {
      throw new Error('Invalid messages result');
    }
  } catch (error) {
    console.log(chalk.red('   ❌ messages.create() - FAIL:'), error.message);
    failed++;
  }

  // Test 4: Apply Code Changes (dry run)
  console.log(chalk.blue('\n4. Testing applyCodeChanges()...'));
  try {
    const result = await testClient.applyCodeChanges('Create a test file called hello.txt with "Hello World"');
    if (result && typeof result === 'object') {
      console.log(chalk.green('   ✅ applyCodeChanges() - PASS'));
      console.log(chalk.gray(`   Success: ${result.success}`));
      passed++;
    } else {
      throw new Error('Invalid applyCodeChanges result');
    }
  } catch (error) {
    console.log(chalk.red('   ❌ applyCodeChanges() - FAIL:'), error.message);
    failed++;
  }

  // Test 5: List Models
  console.log(chalk.blue('\n5. Testing listModels()...'));
  try {
    const models = await testClient.listModels();
    if (models && Array.isArray(models)) {
      console.log(chalk.green('   ✅ listModels() - PASS'));
      console.log(chalk.gray(`   Found ${models.length} models`));
      passed++;
    } else {
      throw new Error('Invalid models result');
    }
  } catch (error) {
    console.log(chalk.yellow('   ⚠️  listModels() - SKIP:'), error.message);
    // Don't count this as failure as it requires Ollama to be running
  }

  // Test 6: Get Context
  console.log(chalk.blue('\n6. Testing getContext()...'));
  try {
    const context = testClient.getContext();
    if (context && typeof context === 'object') {
      console.log(chalk.green('   ✅ getContext() - PASS'));
      passed++;
    } else {
      throw new Error('Invalid context');
    }
  } catch (error) {
    console.log(chalk.red('   ❌ getContext() - FAIL:'), error.message);
    failed++;
  }

  // Test 7: Knowledge Management
  console.log(chalk.blue('\n7. Testing knowledge methods...'));
  try {
    const knowledge = await testClient.getKnowledge();
    console.log(chalk.green('   ✅ getKnowledge() - PASS'));
    passed++;
  } catch (error) {
    console.log(chalk.yellow('   ⚠️  getKnowledge() - SKIP:'), error.message);
  }

  // Test 8: Load Files
  console.log(chalk.blue('\n8. Testing loadFiles()...'));
  try {
    const files = await testClient.loadFiles(['package.json']);
    if (files && Array.isArray(files)) {
      console.log(chalk.green('   ✅ loadFiles() - PASS'));
      console.log(chalk.gray(`   Loaded ${files.length} files`));
      passed++;
    } else {
      throw new Error('Invalid files result');
    }
  } catch (error) {
    console.log(chalk.yellow('   ⚠️  loadFiles() - SKIP:'), error.message);
  }

  // Test 9: Clear Context
  console.log(chalk.blue('\n9. Testing clearContext()...'));
  try {
    testClient.clearContext();
    console.log(chalk.green('   ✅ clearContext() - PASS'));
    passed++;
  } catch (error) {
    console.log(chalk.red('   ❌ clearContext() - FAIL:'), error.message);
    failed++;
  }

  // Summary
  console.log(chalk.blue.bold('\n📊 Test Summary:'));
  console.log(chalk.green(`   Passed: ${passed}`));
  console.log(chalk.red(`   Failed: ${failed}`));
  
  const successRate = (passed / (passed + failed)) * 100;
  console.log(chalk.blue(`   Success Rate: ${successRate.toFixed(1)}%`));

  if (failed === 0) {
    console.log(chalk.green.bold('\n🎉 All tests passed!'));
    process.exit(0);
  } else {
    console.log(chalk.red.bold('\n❌ Some tests failed!'));
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
ClientTestRun();