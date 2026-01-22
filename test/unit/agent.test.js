const path = require('path');
const { Agent } = require('../../src/core/Agent');
const { Config } = require('../../src/core/Config');
const { OllamaClient } = require('../../src/core/OllamaClient');
const { ContextManager } = require('../../src/core/ContextManager');
const { TokenCounter } = require('../../src/core/TokenCounter');
const { createRegistry } = require('../../src/tools');
const { FileUtils } = require('../../src/utils/fileUtils');
const axios = require('axios');

jest.mock('axios');

describe('Agent', () => {
  let config;
  let agent;
  let mockAxiosInstance;

  beforeEach(async () => {
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn()
    };
    axios.create.mockReturnValue(mockAxiosInstance);
    config = new Config(process.cwd());
    await config.load();
    agent = new Agent(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with Config', () => {
      expect(agent.config).toBe(config);
      expect(agent.context).toBeInstanceOf(ContextManager);
      expect(agent.ollama).toBeInstanceOf(OllamaClient);
    });
  });

  describe('addFile', () => {
    test('should add file to context', () => {
      agent.addFile('test.js', 'const x = 1;');
      const files = agent.context.getFiles();
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('test.js');
    });
  });

  describe('runTool', () => {
    test('should run a tool', async () => {
      const fileUtils = new FileUtils(process.cwd());
      const testFile = path.join(__dirname, 'test-agent.txt');
      await fileUtils.writeFile(testFile, 'test content');
      
      const result = await agent.runTool('read', { path: testFile });
      expect(result.content).toBe('test content');
      
      await fileUtils.unlink(testFile).catch(() => {});
    });

    test('should track recent changes for write/edit', async () => {
      const fileUtils = new FileUtils(process.cwd());
      const testFile = path.join(__dirname, 'test-agent-write.txt');
      
      await agent.runTool('write', { path: testFile, content: 'test' });
      const changes = agent.context.getRecentChanges();
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].path).toBe(testFile);
      
      await fileUtils.unlink(testFile).catch(() => {});
    });
  });

  describe('chat', () => {
    test('should send message and get response', async () => {
      const mockResponse = {
        data: {
          response: 'Hello!',
          model: 'codellama:13b',
          done: true
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await agent.chat('Hello', { stream: false });
      expect(result.content).toBe('Hello!');
      
      const messages = agent.context.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    test('should stream response', async () => {
      const { Readable } = require('stream');
      const stream = new Readable({
        read() {
          this.push('{"response":"Hello","done":false}\n');
          this.push('{"response":" World","done":true}\n');
          this.push(null);
        }
      });
      mockAxiosInstance.post.mockResolvedValue({ data: stream });

      const res = await agent.chat('Hello', { stream: true });
      const chunks = [];
      for await (const { chunk } of res) {
        chunks.push(chunk);
      }
      
      expect(chunks.join('')).toBe('Hello World');
      const messages = agent.context.getMessages();
      expect(messages[1].content).toBe('Hello World');
    });
  });

  describe('clearContext', () => {
    test('should clear all context', () => {
      agent.addFile('test.js', 'content');
      agent.context.addMessage('user', 'Hello');
      agent.clearContext();
      expect(agent.context.getFiles()).toHaveLength(0);
      expect(agent.context.getMessages()).toHaveLength(0);
    });
  });
});
