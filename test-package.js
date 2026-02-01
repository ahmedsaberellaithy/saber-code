#!/usr/bin/env node

/**
 * Package Installation Test Script
 * 
 * This script tests the npm package by:
 * 1. Creating a temporary test directory
 * 2. Packing the current package
 * 3. Installing it in the test directory
 * 4. Running the CLI commands to verify they work
 * 5. Cleaning up
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`)
};

const testDir = path.join(os.tmpdir(), `saber-code-test-${Date.now()}`);
let packageFile = '';

function exec(command, options = {}) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout || error.stderr || ''
    };
  }
}

function cleanup() {
  log.step('Cleaning up...');
  
  // Remove test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
    log.success('Removed test directory');
  }
  
  // Remove package tarball
  if (packageFile && fs.existsSync(packageFile)) {
    fs.unlinkSync(packageFile);
    log.success('Removed package tarball');
  }
}

async function runTests() {
  log.title('🧪 Saber Code CLI - Package Installation Test');
  
  let testsRun = 0;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Step 1: Pack the package
    log.step('Step 1: Packing the package...');
    const packResult = exec('npm pack', { silent: true });
    
    if (!packResult.success) {
      log.error('Failed to pack the package');
      console.error(packResult.error);
      process.exit(1);
    }
    
    // Get the package filename
    const files = fs.readdirSync(process.cwd());
    packageFile = files.find(f => f.endsWith('.tgz'));
    
    if (!packageFile) {
      log.error('Package tarball not found');
      process.exit(1);
    }
    
    log.success(`Package created: ${packageFile}`);
    
    // Step 2: Create test directory
    log.step('Step 2: Creating test directory...');
    fs.mkdirSync(testDir, { recursive: true });
    log.success(`Test directory: ${testDir}`);
    
    // Step 3: Install the package
    log.step('Step 3: Installing package in test directory...');
    const packagePath = path.join(process.cwd(), packageFile);
    const installResult = exec(`npm install ${packagePath}`, {
      cwd: testDir,
      silent: true
    });
    
    if (!installResult.success) {
      log.error('Failed to install package');
      console.error(installResult.error);
      process.exit(1);
    }
    
    log.success('Package installed successfully');
    
    // Step 4: Verify package structure
    log.step('Step 4: Verifying package structure...');
    
    const modulePath = path.join(testDir, 'node_modules', 'saber-code-cli');
    const requiredFiles = ['cli.js', 'index.js', 'src', 'package.json', 'README.md'];
    const excludedItems = ['test', 'docs', 'coverage', '.env'];
    
    testsRun++;
    let structureValid = true;
    
    for (const file of requiredFiles) {
      const filePath = path.join(modulePath, file);
      if (!fs.existsSync(filePath)) {
        log.error(`Required file/directory missing: ${file}`);
        structureValid = false;
      }
    }
    
    for (const item of excludedItems) {
      const itemPath = path.join(modulePath, item);
      if (fs.existsSync(itemPath)) {
        log.warn(`Excluded item found in package: ${item}`);
      }
    }
    
    if (structureValid) {
      log.success('Package structure is valid');
      testsPassed++;
    } else {
      log.error('Package structure is invalid');
      testsFailed++;
    }
    
    // Step 5: Test CLI command availability
    log.step('Step 5: Testing CLI command availability...');
    
    testsRun++;
    const cliPath = path.join(modulePath, 'cli.js');
    const cliExecutable = fs.existsSync(cliPath);
    
    if (cliExecutable) {
      log.success('CLI executable found');
      testsPassed++;
    } else {
      log.error('CLI executable not found');
      testsFailed++;
    }
    
    // Step 6: Test CLI help command
    log.step('Step 6: Testing CLI help command...');
    
    testsRun++;
    const helpResult = exec(`node ${cliPath} --help`, { silent: true });
    
    if (helpResult.success && helpResult.output.includes('saber-code')) {
      log.success('CLI help command works');
      testsPassed++;
    } else {
      log.error('CLI help command failed');
      testsFailed++;
    }
    
    // Step 7: Test CLI version
    log.step('Step 7: Testing CLI version command...');
    
    testsRun++;
    const versionResult = exec(`node ${cliPath} --version`, { silent: true });
    
    if (versionResult.success) {
      log.success(`CLI version: ${versionResult.output.trim()}`);
      testsPassed++;
    } else {
      log.error('CLI version command failed');
      testsFailed++;
    }
    
    // Step 8: Verify dependencies
    log.step('Step 8: Verifying dependencies...');
    
    testsRun++;
    const packageJsonPath = path.join(modulePath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = ['axios', 'chalk', 'commander', 'dotenv', 'glob', 'inquirer'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missingDeps.length === 0) {
      log.success('All required dependencies present');
      testsPassed++;
    } else {
      log.error(`Missing dependencies: ${missingDeps.join(', ')}`);
      testsFailed++;
    }
    
    // Step 9: Check package size
    log.step('Step 9: Checking package size...');
    
    const stats = fs.statSync(packagePath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    if (stats.size < 5 * 1024 * 1024) { // Less than 5MB
      log.success(`Package size: ${sizeInMB} MB (acceptable)`);
    } else if (stats.size < 10 * 1024 * 1024) { // Less than 10MB
      log.warn(`Package size: ${sizeInMB} MB (large but acceptable)`);
    } else {
      log.warn(`Package size: ${sizeInMB} MB (very large, consider optimization)`);
    }
    
    // Step 10: Test importability
    log.step('Step 10: Testing module importability...');
    
    testsRun++;
    try {
      const indexPath = path.join(modulePath, 'index.js');
      require(indexPath);
      log.success('Module can be imported successfully');
      testsPassed++;
    } catch (error) {
      log.error(`Module import failed: ${error.message}`);
      testsFailed++;
    }
    
  } catch (error) {
    log.error(`Test failed with error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    cleanup();
  }
  
  // Summary
  log.title('📊 Test Summary');
  console.log(`Total Tests:  ${testsRun}`);
  console.log(`${colors.green}Passed:       ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed:       ${testsFailed}${colors.reset}`);
  console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    log.title('✅ All package tests passed! Ready to publish.');
    process.exit(0);
  } else {
    log.title('❌ Some tests failed. Please fix before publishing.');
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n');
  log.warn('Test interrupted by user');
  cleanup();
  process.exit(130);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  cleanup();
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  cleanup();
  process.exit(1);
});
