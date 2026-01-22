const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Create a temporary directory for testing
 * @returns {Promise<string>} Path to the temporary directory
 */
async function createTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'saber-test-'));
  return tempDir;
}

/**
 * Cleanup temporary directory
 * @param {string} dirPath - Path to directory to cleanup
 */
async function cleanupTempDir(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors during cleanup
    if (error.code !== 'ENOENT') {
      console.warn('Cleanup warning:', error.message);
    }
  }
}

/**
 * Mock Ollama response helper
 * @param {string} content - Response content
 * @param {string} model - Model name
 * @returns {Object} Mock response object
 */
function mockOllamaResponse(content, model = 'codellama:13b') {
  return {
    data: {
      response: content,
      model: model,
      created_at: new Date().toISOString(),
      done: true
    }
  };
}

/**
 * Create a mock project structure for testing
 * @param {string} rootPath - Root path for the mock project
 */
async function createMockProject(rootPath) {
  // Create basic directory structure
  await fs.mkdir(path.join(rootPath, 'src', 'core'), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'src', 'utils'), { recursive: true });
  
  // Create package.json
  const packageJson = {
    name: 'test-project',
    version: '1.0.0',
    description: 'Test project',
    dependencies: {
      'express': '^4.18.0',
      'axios': '^1.5.0'
    },
    devDependencies: {
      'jest': '^29.7.0'
    },
    scripts: {
      'start': 'node index.js',
      'test': 'jest'
    }
  };
  
  await fs.writeFile(
    path.join(rootPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create sample source files
  await fs.writeFile(
    path.join(rootPath, 'src', 'index.js'),
    '// Main entry point\nconst app = require("./app");\napp.start();'
  );
  
  await fs.writeFile(
    path.join(rootPath, 'src', 'app.js'),
    'class App {\n  start() {\n    console.log("App started");\n  }\n}\nmodule.exports = new App();'
  );
  
  // Create README
  await fs.writeFile(
    path.join(rootPath, 'README.md'),
    '# Test Project\n\nThis is a test project for Saber Code CLI.'
  );
  
  // Create config file
  await fs.writeFile(
    path.join(rootPath, '.gitignore'),
    'node_modules/\n.env\n*.log'
  );
}

/**
 * Create mock AI response with JSON structure for edit operations
 * @param {Array} operations - Array of operations
 * @param {string} reasoning - Reasoning text
 * @returns {string} JSON string response
 */
function mockEditResponse(operations, reasoning = 'Test reasoning') {
  return JSON.stringify({
    reasoning: reasoning,
    operations: operations
  });
}

/**
 * Create invalid/malformed AI response
 * @returns {string} Invalid response
 */
function mockInvalidResponse() {
  return 'This is not valid JSON {incomplete';
}

module.exports = {
  createTempDir,
  cleanupTempDir,
  mockOllamaResponse,
  createMockProject,
  mockEditResponse,
  mockInvalidResponse
};

