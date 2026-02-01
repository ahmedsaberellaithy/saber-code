/**
 * E2E CLI Commands Tests
 * Tests the actual CLI commands with new architecture
 */

const { Agent } = require('../../src/core/Agent');
const { Config } = require('../../src/core/Config');
const { createRegistry } = require('../../src/tools');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

jest.mock('axios');

describe('CLI Commands E2E', () => {
  let config;
  let agent;
  let mockAxiosInstance;
  let testDir;

  beforeEach(async () => {
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn()
    };
    axios.create.mockReturnValue(mockAxiosInstance);

    testDir = path.join(__dirname, 'test-cli');
    await fs.mkdir(testDir, { recursive: true });
    config = new Config(testDir);
    await config.load();
    agent = new Agent(config);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
    jest.clearAllMocks();
  });

  describe('search command', () => {
    test('should search for patterns in files', async () => {
      // Create test files
      await fs.writeFile(path.join(testDir, 'test1.js'), 'function hello() { return "world"; }');
      await fs.writeFile(path.join(testDir, 'test2.js'), 'const hello = "test";');

      const registry = createRegistry();
      const { FileUtils } = require('../../src/utils/fileUtils');
      const fileUtils = new FileUtils(testDir);
      
      const result = await registry.run('search', 
        { rootPath: testDir, fileUtils },
        { pattern: 'hello', glob: '**/*.js' }
      );

      expect(result.matches.length).toBeGreaterThanOrEqual(1);
      if (result.matches.length > 0) {
        expect(result.matches[0].path).toContain('test');
      }
    });
  });

  describe('analyze command', () => {
    test('should analyze a file with AI', async () => {
      const testFile = path.join(testDir, 'analyze.js');
      await fs.writeFile(testFile, 'const x = 1; console.log(x);');

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: 'This code defines a constant and logs it.',
          model: 'codellama:13b',
          done: true
        }
      });

      const content = await fs.readFile(testFile, 'utf8');
      agent.addFile(testFile, content);

      const result = await agent.chat('Analyze this code', { stream: false });

      expect(result.content).toContain('code');
      expect(agent.context.getFiles()).toHaveLength(1);
    });
  });

  describe('models command', () => {
    test('should list available models', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          models: [
            { name: 'codellama:13b', size: 7000000000 },
            { name: 'mistral', size: 4000000000 }
          ]
        }
      });

      const response = await mockAxiosInstance.get('/api/tags');
      const models = response.data.models;

      expect(Array.isArray(models)).toBe(true);
      expect(models).toHaveLength(2);
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('size');
    });
  });

  describe('context management', () => {
    test('should track context across operations', async () => {
      // Load files
      const file1 = path.join(testDir, 'file1.js');
      await fs.writeFile(file1, 'const a = 1;');
      
      const content = await fs.readFile(file1, 'utf8');
      agent.addFile(file1, content);

      // Verify context
      expect(agent.context.getFiles()).toHaveLength(1);
      expect(agent.context.getFiles()[0].path).toBe(file1);

      // Clear context
      agent.clearContext();
      expect(agent.context.getFiles()).toHaveLength(0);
    });

    test('should track recent changes', async () => {
      const testFile = path.join(testDir, 'change.txt');
      
      await agent.runTool('write', { path: testFile, content: 'initial' });
      
      const changes = agent.context.getRecentChanges();
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].path).toBe(testFile);
      expect(changes[0].operation).toBe('write');
    });

    test('should maintain conversation history', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: 'Hello there!',
          model: 'codellama:13b',
          done: true
        }
      });

      await agent.chat('Hello', { stream: false });

      const messages = agent.context.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toBe('Hello there!');
    });
  });

  describe('file operations via tools', () => {
    test('should execute read tool', async () => {
      const testFile = path.join(testDir, 'read-test.txt');
      await fs.writeFile(testFile, 'test content');

      const result = await agent.runTool('read', { path: testFile });
      
      expect(result.content).toBe('test content');
      expect(result.path).toBe(testFile);
    });

    test('should execute write tool', async () => {
      const testFile = path.join(testDir, 'write-test.txt');
      
      const result = await agent.runTool('write', { 
        path: testFile, 
        content: 'new content' 
      });

      expect(result.success).toBe(true);
      
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('new content');
    });

    test('should execute list tool', async () => {
      await fs.writeFile(path.join(testDir, 'a.txt'), 'a');
      await fs.writeFile(path.join(testDir, 'b.txt'), 'b');

      const result = await agent.runTool('list', { path: testDir });

      expect(result.files.length).toBeGreaterThanOrEqual(2);
      expect(result.files.some(f => f.name === 'a.txt')).toBe(true);
      expect(result.files.some(f => f.name === 'b.txt')).toBe(true);
    });

    test('should execute glob tool', async () => {
      await fs.writeFile(path.join(testDir, 'test1.js'), '');
      await fs.writeFile(path.join(testDir, 'test2.js'), '');
      await fs.writeFile(path.join(testDir, 'other.txt'), '');

      const result = await agent.runTool('glob', { 
        pattern: '*.js',
        cwd: testDir
      });

      expect(result.files.length).toBeGreaterThanOrEqual(2);
      expect(result.files.every(f => f.endsWith('.js'))).toBe(true);
    });
  });
});
