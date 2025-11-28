#!/usr/bin/env node

const { spawn } = require('child_process');
const chalk = require('chalk');

async function runTests() {
  console.log(chalk.blue.bold('🧪 Running Saber CLI Test Suite\n'));

  const tests = [
    { name: 'Unit Tests', command: 'npm', args: ['run', 'test:unit'] },
    { name: 'Integration Tests', command: 'npm', args: ['run', 'test:integration'] },
    { name: 'Path Resolution Test', command: 'node', args: ['test/unit/path-resolution.test.js'] }
  ];

  for (const test of tests) {
    console.log(chalk.blue(`\n📋 Running ${test.name}...`));
    
    try {
      await runCommand(test.command, test.args);
      console.log(chalk.green(`✅ ${test.name} passed`));
    } catch (error) {
      console.log(chalk.red(`❌ ${test.name} failed: ${error.message}`));
    }
  }

  console.log(chalk.blue.bold('\n🎉 Test suite completed!'));
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'inherit' });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

// Install Jest if not present
async function ensureDependencies() {
  try {
    require('jest');
  } catch (error) {
    console.log(chalk.yellow('📦 Installing Jest for testing...'));
    await runCommand('npm', ['install', '--save-dev', 'jest']);
  }
}

ensureDependencies().then(() => {
  runTests().catch(console.error);
});
