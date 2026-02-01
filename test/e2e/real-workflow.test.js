/**
 * E2E tests for real-world workflows
 * These tests simulate actual user scenarios
 */

const { Agent } = require('../../src/core/Agent');
const { PlanManager } = require('../../src/core/PlanManager');
const { Config } = require('../../src/core/Config');
const { createRegistry } = require('../../src/tools');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

jest.mock('axios');

describe('Real-World Workflows E2E', () => {
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

    testDir = path.join(__dirname, 'test-workflow');
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

  describe('Workflow: Code Analysis and Modification', () => {
    test('should analyze file, create plan, and execute modifications', async () => {
      // Business scenario: Add error handling to existing function
      
      // Step 1: Create initial file
      const sourceFile = path.join(testDir, 'calculator.js');
      const initialCode = `
function divide(a, b) {
  return a / b;
}

module.exports = { divide };
`;
      await fs.writeFile(sourceFile, initialCode);

      // Step 2: Load file into context (user runs: saber-code chat)
      const content = await fs.readFile(sourceFile, 'utf8');
      agent.addFile(sourceFile, content);
      
      // Verify context loaded
      expect(agent.context.getFiles()).toHaveLength(1);

      // Step 3: User asks for analysis
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: 'This function divides two numbers but lacks error handling for division by zero.',
          model: 'codellama:13b',
          done: true
        }
      });

      const analysis = await agent.chat('Analyze this code', { stream: false });
      expect(analysis.content).toContain('error handling');

      // Step 4: User creates plan (saber-code plan "Add error handling")
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: JSON.stringify({
            goal: 'Add error handling for division by zero',
            steps: [
              { tool: 'read', args: { path: sourceFile } },
              {
                tool: 'edit',
                args: {
                  path: sourceFile,
                  operation: 'replace',
                  oldText: 'function divide(a, b) {\n  return a / b;\n}',
                  newText: 'function divide(a, b) {\n  if (b === 0) throw new Error("Division by zero");\n  return a / b;\n}'
                }
              }
            ]
          }),
          model: 'codellama:13b',
          done: true
        }
      });

      const { plan } = await planManager.create('Add error handling for division by zero');
      expect(plan.goal).toContain('error handling');
      expect(plan.steps).toHaveLength(2);

      // Step 5: User executes plan
      const result = await planManager.execute(plan);
      expect(result.completed).toBe(true);
      expect(result.results[0].ok).toBe(true); // read succeeded
      expect(result.results[1].ok).toBe(true); // edit succeeded

      // Step 6: Verify modification
      const modifiedCode = await fs.readFile(sourceFile, 'utf8');
      expect(modifiedCode).toContain('if (b === 0)');
      expect(modifiedCode).toContain('Division by zero');
    });
  });

  describe('Workflow: Multi-File Project Setup', () => {
    test('should create multiple related files based on plan', async () => {
      // Business scenario: Create basic Node.js project structure

      // Mock plan creation
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: JSON.stringify({
            goal: 'Create basic Node.js project with index, config, and README',
            steps: [
              {
                tool: 'write',
                args: {
                  path: path.join(testDir, 'index.js'),
                  content: 'const config = require("./config");\nconsole.log("App started");\n'
                }
              },
              {
                tool: 'write',
                args: {
                  path: path.join(testDir, 'config.js'),
                  content: 'module.exports = { port: 3000 };\n'
                }
              },
              {
                tool: 'write',
                args: {
                  path: path.join(testDir, 'README.md'),
                  content: '# Test Project\n\nA test application.\n'
                }
              }
            ]
          }),
          model: 'codellama:13b',
          done: true
        }
      });

      const { plan } = await planManager.create('Create basic Node.js project');
      expect(plan.steps).toHaveLength(3);

      const result = await planManager.execute(plan);
      expect(result.completed).toBe(true);

      // Verify all files created
      const indexExists = await fs.access(path.join(testDir, 'index.js')).then(() => true).catch(() => false);
      const configExists = await fs.access(path.join(testDir, 'config.js')).then(() => true).catch(() => false);
      const readmeExists = await fs.access(path.join(testDir, 'README.md')).then(() => true).catch(() => false);

      expect(indexExists).toBe(true);
      expect(configExists).toBe(true);
      expect(readmeExists).toBe(true);
    });
  });

  describe('Workflow: Search and Refactor', () => {
    test('should search for pattern and refactor matches', async () => {
      // Business scenario: Find all console.log and replace with logger

      // Setup: Create files with console.log
      await fs.writeFile(path.join(testDir, 'file1.js'), 'console.log("debug");\n');
      await fs.writeFile(path.join(testDir, 'file2.js'), 'console.log("info");\n');

      // User searches (saber-code search "console.log")
      const registry = createRegistry();
      const {FileUtils} = require('../../src/utils/fileUtils');
      const fileUtils = new FileUtils(testDir);
      const searchResult = await registry.run('search', 
        { rootPath: testDir, fileUtils },
        { pattern: 'console.log', glob: '**/*.js' }
      );

      expect(searchResult.matches.length).toBeGreaterThanOrEqual(2);

      // User creates refactoring plan
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
          model: 'codellama:13b',
          done: true
        }
      });

      const { plan } = await planManager.create('Replace console.log with logger');
      const result = await planManager.execute(plan);

      expect(result.completed).toBe(true);

      // Verify changes
      const file1 = await fs.readFile(path.join(testDir, 'file1.js'), 'utf8');
      const file2 = await fs.readFile(path.join(testDir, 'file2.js'), 'utf8');

      expect(file1).toContain('logger.debug');
      expect(file2).toContain('logger.info');
      expect(file1).not.toContain('console.log');
      expect(file2).not.toContain('console.log');
    });
  });

  describe('Workflow: Error Recovery', () => {
    test('should handle partial failure and continue with --continue-on-error', async () => {
      // Business scenario: Some operations fail but others should continue

      const plan = {
        goal: 'Create files with one invalid operation',
        steps: [
          {
            tool: 'write',
            args: { path: path.join(testDir, 'success1.txt'), content: 'first' }
          },
          {
            tool: 'read',
            args: { path: path.join(testDir, 'nonexistent.txt') } // This will fail
          },
          {
            tool: 'write',
            args: { path: path.join(testDir, 'success2.txt'), content: 'third' }
          }
        ],
        createdAt: new Date().toISOString()
      };

      const result = await planManager.execute(plan, { continueOnError: true });

      expect(result.completed).toBe(false); // Not fully completed due to failure
      expect(result.results).toHaveLength(3);
      expect(result.results[0].ok).toBe(true);  // First write succeeded
      expect(result.results[1].ok).toBe(false); // Read failed
      expect(result.results[2].ok).toBe(true);  // Third write succeeded

      // Verify files that should exist
      const file1 = await fs.access(path.join(testDir, 'success1.txt')).then(() => true).catch(() => false);
      const file2 = await fs.access(path.join(testDir, 'success2.txt')).then(() => true).catch(() => false);

      expect(file1).toBe(true);
      expect(file2).toBe(true);
    });
  });

  describe('Workflow: Context-Aware Suggestions', () => {
    test('should provide suggestions based on loaded context', async () => {
      // Business scenario: Load project files and ask for improvements

      // Create a simple project
      await fs.writeFile(path.join(testDir, 'app.js'), 'const express = require("express");\n');
      await fs.writeFile(path.join(testDir, 'package.json'), '{"name":"test","dependencies":{}}');

      // Load files into context
      const app = await fs.readFile(path.join(testDir, 'app.js'), 'utf8');
      const pkg = await fs.readFile(path.join(testDir, 'package.json'), 'utf8');
      
      agent.addFile('app.js', app);
      agent.addFile('package.json', pkg);

      // Mock response with context-aware suggestions
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: 'Based on app.js using express, package.json should include express in dependencies.',
          model: 'codellama:13b',
          done: true
        }
      });

      const response = await agent.chat('Review my project', { stream: false });

      expect(response.content).toContain('express');
      expect(response.content).toContain('dependencies');
      
      // Verify context was used (files were in context)
      const contextText = agent.getContextForPrompt(10000);
      expect(contextText.text).toContain('app.js');
      expect(contextText.text).toContain('package.json');
    });
  });
});
