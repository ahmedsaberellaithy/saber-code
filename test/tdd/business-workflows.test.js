/**
 * TDD Business Workflows Tests
 * 
 * These tests cover real-world business scenarios that users will encounter.
 * Written in TDD style: tests define the expected behavior from a business perspective.
 */

const { Agent } = require('../../src/core/Agent');
const { PlanManager } = require('../../src/core/PlanManager');
const { Config } = require('../../src/core/Config');
const { createRegistry } = require('../../src/tools');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

jest.mock('axios');

describe('TDD Business Workflows', () => {
  let config;
  let agent;
  let planManager;
  let testDir;
  let mockAxiosInstance;

  beforeEach(async () => {
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn()
    };
    axios.create.mockReturnValue(mockAxiosInstance);

    testDir = path.join(__dirname, 'test-business');
    await fs.mkdir(testDir, { recursive: true });
    config = new Config(testDir);
    await config.load();
    agent = new Agent(config);
    planManager = new PlanManager(config, agent);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      await fs.rm(path.join(testDir, '../_saber_code_plans'), { recursive: true, force: true }).catch(() => {});
    } catch {}
  });

  describe('Business Scenario: Developer Onboarding', () => {
    test('New developer should be able to understand codebase structure', async () => {
      // Given: A new developer joins the project
      await fs.writeFile(path.join(testDir, 'README.md'), '# Project\nA sample project');
      await fs.writeFile(path.join(testDir, 'package.json'), '{"name":"app","version":"1.0.0"}');
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'src/index.js'), 'console.log("Hello")');

      // When: They use search to explore
      const registry = createRegistry();
      const searchResult = await registry.run('search',
        { rootPath: testDir },
        { pattern: 'console', path: testDir }
      );

      // Then: They find relevant code
      expect(searchResult.matches.length).toBeGreaterThan(0);
      expect(searchResult.matches[0].file).toContain('index.js');
    });

    test('New developer should be able to ask questions about the code', async () => {
      // Given: Code exists
      const sourceFile = path.join(testDir, 'auth.js');
      await fs.writeFile(sourceFile, 'function login(user, pass) { return true; }');
      
      const content = await fs.readFile(sourceFile, 'utf8');
      agent.addFile(sourceFile, content);

      // When: They ask about it
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: 'This is a login function that authenticates users.',
          model: 'qwen2.5-coder:32b-instruct',
          done: true
        }
      });

      const response = await agent.chat('What does this code do?', { stream: false });

      // Then: They get helpful explanation
      expect(response.content).toContain('login');
      expect(response.content).toBeDefined();
    });
  });

  describe('Business Scenario: Bug Fixing', () => {
    test('Developer should identify bug location', async () => {
      // Given: Buggy code exists
      const buggyFile = path.join(testDir, 'calculator.js');
      await fs.writeFile(buggyFile, 'function divide(a, b) { return a / b; }');

      // When: Developer analyzes it
      const content = await fs.readFile(buggyFile, 'utf8');
      agent.addFile(buggyFile, content);

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: 'The divide function has no error handling for division by zero.',
          model: 'qwen2.5-coder:32b-instruct',
          done: true
        }
      });

      const analysis = await agent.chat('Find bugs in this code', { stream: false });

      // Then: Bug is identified
      expect(analysis.content).toContain('error');
    });

    test('Developer should create fix plan and execute it', async () => {
      // Given: Bug identified
      const buggyFile = path.join(testDir, 'calculator.js');
      await fs.writeFile(buggyFile, 'function divide(a, b) { return a / b; }');

      // When: Plan is created to fix it
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: JSON.stringify({
            goal: 'Add error handling to divide function',
            steps: [
              { tool: 'read', args: { path: buggyFile } },
              {
                tool: 'edit',
                args: {
                  path: buggyFile,
                  operation: 'replace',
                  oldText: 'function divide(a, b) { return a / b; }',
                  newText: 'function divide(a, b) { if (b === 0) throw new Error("Division by zero"); return a / b; }'
                }
              }
            ]
          }),
          model: 'qwen2.5-coder:32b-instruct',
          done: true
        }
      });

      const { plan } = await planManager.create('Fix division by zero bug');
      const result = await planManager.execute(plan);

      // Then: Bug is fixed
      expect(result.completed).toBe(true);
      const fixed = await fs.readFile(buggyFile, 'utf8');
      expect(fixed).toContain('if (b === 0)');
    });
  });

  describe('Business Scenario: Feature Development', () => {
    test('Developer should be able to add new function to existing file', async () => {
      // Given: Existing module
      const moduleFile = path.join(testDir, 'math.js');
      await fs.writeFile(moduleFile, 'function add(a, b) { return a + b; }\nmodule.exports = { add };');

      // When: Developer plans to add multiply function
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: JSON.stringify({
            goal: 'Add multiply function to math.js',
            steps: [
              {
                tool: 'edit',
                args: {
                  path: moduleFile,
                  operation: 'replace',
                  oldText: 'module.exports = { add };',
                  newText: 'function multiply(a, b) { return a * b; }\nmodule.exports = { add, multiply };'
                }
              }
            ]
          }),
          model: 'qwen2.5-coder:32b-instruct',
          done: true
        }
      });

      const { plan } = await planManager.create('Add multiply function');
      const result = await planManager.execute(plan);

      // Then: New function is added
      expect(result.completed).toBe(true);
      const updated = await fs.readFile(moduleFile, 'utf8');
      expect(updated).toContain('multiply');
      expect(updated).toContain('add'); // Original function preserved
    });

    test('Developer should be able to create new module from scratch', async () => {
      // Given: Need for new utility module
      const newFile = path.join(testDir, 'utils.js');

      // When: Plan is created and executed
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: JSON.stringify({
            goal: 'Create utils module with helper functions',
            steps: [
              {
                tool: 'write',
                args: {
                  path: newFile,
                  content: 'function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }\nmodule.exports = { capitalize };'
                }
              }
            ]
          }),
          model: 'qwen2.5-coder:32b-instruct',
          done: true
        }
      });

      const { plan } = await planManager.create('Create utils module');
      const result = await planManager.execute(plan);

      // Then: New module exists and works
      expect(result.completed).toBe(true);
      const exists = await fs.access(newFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      const content = await fs.readFile(newFile, 'utf8');
      expect(content).toContain('capitalize');
    });
  });

  describe('Business Scenario: Code Refactoring', () => {
    test('Developer should refactor multiple files consistently', async () => {
      // Given: Multiple files using old pattern
      await fs.writeFile(path.join(testDir, 'file1.js'), 'console.log("debug");');
      await fs.writeFile(path.join(testDir, 'file2.js'), 'console.log("info");');

      // When: Refactoring plan is executed
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: JSON.stringify({
            goal: 'Replace console.log with logger',
            steps: [
              {
                tool: 'edit',
                args: {
                  path: path.join(testDir, 'file1.js'),
                  operation: 'replace',
                  oldText: 'console.log',
                  newText: 'logger.debug'
                }
              },
              {
                tool: 'edit',
                args: {
                  path: path.join(testDir, 'file2.js'),
                  operation: 'replace',
                  oldText: 'console.log',
                  newText: 'logger.info'
                }
              }
            ]
          }),
          model: 'qwen2.5-coder:32b-instruct',
          done: true
        }
      });

      const { plan } = await planManager.create('Refactor logging');
      const result = await planManager.execute(plan);

      // Then: All files refactored consistently
      expect(result.completed).toBe(true);
      const file1 = await fs.readFile(path.join(testDir, 'file1.js'), 'utf8');
      const file2 = await fs.readFile(path.join(testDir, 'file2.js'), 'utf8');
      expect(file1).toContain('logger.debug');
      expect(file2).toContain('logger.info');
    });
  });

  describe('Business Scenario: Documentation', () => {
    test('Developer should be able to add documentation to functions', async () => {
      // Given: Undocumented function
      const sourceFile = path.join(testDir, 'api.js');
      await fs.writeFile(sourceFile, 'function fetchUser(id) { return fetch(`/api/users/${id}`); }');

      // When: Documentation plan is created
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: JSON.stringify({
            goal: 'Add JSDoc to fetchUser function',
            steps: [
              {
                tool: 'edit',
                args: {
                  path: sourceFile,
                  operation: 'replace',
                  oldText: 'function fetchUser(id) {',
                  newText: '/**\n * Fetch user by ID from API\n * @param {string} id - User ID\n * @returns {Promise} User data\n */\nfunction fetchUser(id) {'
                }
              }
            ]
          }),
          model: 'qwen2.5-coder:32b-instruct',
          done: true
        }
      });

      const { plan } = await planManager.create('Add documentation');
      const result = await planManager.execute(plan);

      // Then: Documentation is added
      expect(result.completed).toBe(true);
      const documented = await fs.readFile(sourceFile, 'utf8');
      expect(documented).toContain('/**');
      expect(documented).toContain('@param');
    });
  });

  describe('Business Scenario: Testing', () => {
    test('Developer should be able to create test file for existing code', async () => {
      // Given: Source code exists
      await fs.writeFile(path.join(testDir, 'validator.js'), 'function isEmail(str) { return /@/.test(str); }');

      // When: Test creation plan is executed
      const testFile = path.join(testDir, 'validator.test.js');
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: JSON.stringify({
            goal: 'Create tests for validator',
            steps: [
              {
                tool: 'write',
                args: {
                  path: testFile,
                  content: 'const { isEmail } = require("./validator");\ntest("validates email", () => {\n  expect(isEmail("test@example.com")).toBe(true);\n});'
                }
              }
            ]
          }),
          model: 'qwen2.5-coder:32b-instruct',
          done: true
        }
      });

      const { plan } = await planManager.create('Create validator tests');
      const result = await planManager.execute(plan);

      // Then: Test file is created
      expect(result.completed).toBe(true);
      const exists = await fs.access(testFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('Business Scenario: Error Recovery', () => {
    test('Developer should be notified if operation fails', async () => {
      // Given: Invalid operation in plan
      const plan = {
        goal: 'Test error handling',
        steps: [
          { tool: 'read', args: { path: 'nonexistent.js' } }
        ],
        createdAt: new Date().toISOString()
      };

      // When: Plan is executed
      const result = await planManager.execute(plan);

      // Then: Error is reported clearly
      expect(result.completed).toBe(false);
      expect(result.failedAt).toBe(0);
      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].error).toBeDefined();
    });

    test('Developer should be able to continue after partial failure', async () => {
      // Given: Plan with one failing step
      const plan = {
        goal: 'Test continue on error',
        steps: [
          { tool: 'read', args: { path: 'nonexistent.js' } },
          { tool: 'write', args: { path: path.join(testDir, 'success.txt'), content: 'done' } }
        ],
        createdAt: new Date().toISOString()
      };

      // When: Executed with continueOnError
      const result = await planManager.execute(plan, { continueOnError: true });

      // Then: Second step completes despite first failing
      expect(result.results).toHaveLength(2);
      expect(result.results[0].ok).toBe(false);
      expect(result.results[1].ok).toBe(true);
      
      const file = await fs.readFile(path.join(testDir, 'success.txt'), 'utf8');
      expect(file).toBe('done');
    });
  });

  describe('Business Scenario: Context Management', () => {
    test('Developer should work with multiple files in context', async () => {
      // Given: Multiple related files
      await fs.writeFile(path.join(testDir, 'config.js'), 'module.exports = { port: 3000 };');
      await fs.writeFile(path.join(testDir, 'server.js'), 'const config = require("./config");');

      // When: Both loaded into context
      const config1 = await fs.readFile(path.join(testDir, 'config.js'), 'utf8');
      const config2 = await fs.readFile(path.join(testDir, 'server.js'), 'utf8');
      
      agent.addFile('config.js', config1);
      agent.addFile('server.js', config2);

      // Then: Context contains both files
      const files = agent.context.getFiles();
      expect(files).toHaveLength(2);
      expect(files.map(f => f.path)).toContain('config.js');
      expect(files.map(f => f.path)).toContain('server.js');
    });

    test('Developer should see recent changes in context', async () => {
      // Given: File operations occur
      const file1 = path.join(testDir, 'change1.txt');
      const file2 = path.join(testDir, 'change2.txt');
      
      await agent.runTool('write', { path: file1, content: 'first' });
      await agent.runTool('write', { path: file2, content: 'second' });

      // When: Checking recent changes
      const changes = agent.context.getRecentChanges();

      // Then: Both operations are tracked
      expect(changes.length).toBeGreaterThanOrEqual(2);
      expect(changes.some(c => c.path === file1)).toBe(true);
      expect(changes.some(c => c.path === file2)).toBe(true);
    });
  });
});
