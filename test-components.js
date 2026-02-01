#!/usr/bin/env node
/**
 * Test script to verify all components work
 */

const chalk = require('chalk');
const path = require('path');

console.log(chalk.blue.bold('🧪 Saber Code CLI - Component Test\n'));

async function testComponent(name, fn) {
  process.stdout.write(chalk.gray(`Testing ${name}... `));
  try {
    await fn();
    console.log(chalk.green('✓'));
    return true;
  } catch (e) {
    console.log(chalk.red('✗'));
    console.log(chalk.red(`  Error: ${e.message}`));
    return false;
  }
}

async function runTests() {
  const results = [];

  // Test 1: Config
  results.push(await testComponent('Config', async () => {
    const { Config } = require('./src/core/Config');
    const config = new Config(process.cwd());
    await config.load();
    if (!config.ollama || !config.context) throw new Error('Config missing properties');
    if (!config.ollama.defaultModel) throw new Error('Default model not set');
    // Model should be qwen2.5-coder:32b-instruct or from .env
    if (!config.ollama.defaultModel.includes('qwen') && !config.ollama.defaultModel.includes('code')) {
      throw new Error(`Unexpected model: ${config.ollama.defaultModel}`);
    }
  }));

  // Test 2: TokenCounter
  results.push(await testComponent('TokenCounter', async () => {
    const { TokenCounter } = require('./src/core/TokenCounter');
    const counter = new TokenCounter();
    const count = counter.count('hello world');
    if (count !== 3) throw new Error('Token count incorrect');
    const truncated = counter.truncate('x'.repeat(100), 10);
    if (!truncated.includes('...')) throw new Error('Truncate not working');
  }));

  // Test 3: OllamaClient (without actually calling Ollama)
  results.push(await testComponent('OllamaClient', async () => {
    const { OllamaClient } = require('./src/core/OllamaClient');
    const { Config } = require('./src/core/Config');
    const config = new Config(process.cwd());
    await config.load();
    const client = new OllamaClient(config);
    if (!client.defaultModel) throw new Error('No default model');
    const prompt = client.messagesToPrompt([
      { role: 'user', content: 'Hello' }
    ]);
    if (!prompt.includes('[INST]')) throw new Error('Prompt formatting incorrect');
  }));

  // Test 4: ContextManager
  results.push(await testComponent('ContextManager', async () => {
    const { ContextManager } = require('./src/core/ContextManager');
    const { Config } = require('./src/core/Config');
    const config = new Config(process.cwd());
    await config.load();
    const ctx = new ContextManager(config);
    ctx.addFile('test.js', 'const x = 1;');
    ctx.addMessage('user', 'Hello');
    const files = ctx.getFiles();
    const messages = ctx.getMessages();
    if (files.length !== 1) throw new Error('File not added');
    if (messages.length !== 1) throw new Error('Message not added');
    const { text } = ctx.getContextForPrompt(1000);
    if (!text.includes('test.js')) throw new Error('Context not built');
  }));

  // Test 5: Tools Registry
  results.push(await testComponent('Tools Registry', async () => {
    const { createRegistry } = require('./src/tools');
    const registry = createRegistry();
    const tools = registry.list();
    if (tools.length !== 7) throw new Error(`Expected 7 tools, got ${tools.length}`);
    const toolNames = tools.map(t => t.name);
    const expected = ['read', 'write', 'edit', 'list', 'search', 'glob', 'shell'];
    for (const name of expected) {
      if (!toolNames.includes(name)) throw new Error(`Missing tool: ${name}`);
    }
  }));

  // Test 6: Agent
  results.push(await testComponent('Agent', async () => {
    const { Agent } = require('./src/core/Agent');
    const { Config } = require('./src/core/Config');
    const config = new Config(process.cwd());
    await config.load();
    const agent = new Agent(config);
    agent.addFile('test.js', 'content');
    const files = agent.context.getFiles();
    if (files.length !== 1) throw new Error('Agent file not added');
    agent.clearContext();
    if (agent.context.getFiles().length !== 0) throw new Error('Context not cleared');
  }));

  // Test 7: PlanManager
  results.push(await testComponent('PlanManager', async () => {
    const { PlanManager } = require('./src/core/PlanManager');
    const { Config } = require('./src/core/Config');
    const config = new Config(process.cwd());
    await config.load();
    const pm = new PlanManager(config);
    if (!pm._plansDir.includes('_saber_code_plans')) throw new Error('Wrong plans directory');
  }));

  // Test 8: CLI Commands
  results.push(await testComponent('CLI Commands', async () => {
    const cli = require('./src/cli');
    const requiredFns = ['runChat', 'runPlan', 'runExec', 'runListPlans', 'runSearch', 'runAnalyze', 'runModels'];
    for (const fn of requiredFns) {
      if (typeof cli[fn] !== 'function') throw new Error(`Missing function: ${fn}`);
    }
  }));

  // Test 9: UI Components
  results.push(await testComponent('UI Components', async () => {
    const { ui } = require('./src/cli');
    const { Spinner, createSpinner, formatDiff, promptInput } = ui;
    if (!Spinner) throw new Error('Spinner not exported');
    if (typeof createSpinner !== 'function') throw new Error('createSpinner not a function');
    if (typeof formatDiff !== 'function') throw new Error('formatDiff not a function');
  }));

  // Test 10: File Operations (read/write tools)
  results.push(await testComponent('File Operations', async () => {
    const { createRegistry } = require('./src/tools');
    const { FileUtils } = require('./src/utils/fileUtils');
    const fs = require('fs').promises;
    const testFile = path.join(__dirname, 'test-temp.txt');
    
    const registry = createRegistry();
    const fileUtils = new FileUtils(process.cwd());
    const ctx = { rootPath: process.cwd(), fileUtils };
    
    // Test write
    await registry.run('write', ctx, { path: testFile, content: 'test content' });
    
    // Test read
    const result = await registry.run('read', ctx, { path: testFile });
    if (result.content !== 'test content') throw new Error('Read/write failed');
    
    // Test edit
    await registry.run('edit', ctx, { path: testFile, oldText: 'test', newText: 'edited', operation: 'replace' });
    const edited = await registry.run('read', ctx, { path: testFile });
    if (!edited.content.includes('edited')) throw new Error('Edit failed');
    
    // Cleanup
    await fs.unlink(testFile);
  }));

  // Summary
  console.log('\n' + chalk.blue.bold('📊 Test Results:'));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`  Passed: ${chalk.green(passed)}/${total}`);
  
  if (passed === total) {
    console.log(chalk.green.bold('\n✅ All components working!\n'));
  } else {
    console.log(chalk.red.bold('\n❌ Some components failed\n'));
    process.exitCode = 1;
  }
}

runTests().catch(e => {
  console.error(chalk.red('\n❌ Test suite error: ' + e.message));
  process.exitCode = 1;
});
