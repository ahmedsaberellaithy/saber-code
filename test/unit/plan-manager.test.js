const { PlanManager } = require('../../src/core/PlanManager');
const { Agent } = require('../../src/core/Agent');
const { Config } = require('../../src/core/Config');
const { OllamaClient } = require('../../src/core/OllamaClient');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

jest.mock('axios');

describe('PlanManager', () => {
  let config;
  let agent;
  let planManager;
  let mockAxiosInstance;
  let testDir;

  beforeEach(async () => {
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn()
    };
    axios.create.mockReturnValue(mockAxiosInstance);
    
    testDir = path.join(__dirname, 'test-plan');
    await fs.mkdir(testDir, { recursive: true });
    config = new Config(testDir);
    await config.load();
    agent = new Agent(config);
    planManager = new PlanManager(config, agent);
  });

  afterEach(async () => {
    try {
      await fs.unlink(config.planPath).catch(() => {});
      await fs.rmdir(config.historyDirPath).catch(() => {});
      await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
    } catch {}
  });

  describe('create', () => {
    test('should create and save a plan', async () => {
      const mockResponse = {
        data: {
          response: JSON.stringify({
            goal: 'Test goal',
            steps: [
              { tool: 'read', args: { path: 'test.js' } }
            ]
          }),
          model: 'codellama:13b',
          done: true
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const plan = await planManager.create('Test goal');
      expect(plan.goal).toBe('Test goal');
      expect(plan.steps).toHaveLength(1);
      
      const saved = await planManager.load();
      expect(saved.goal).toBe('Test goal');
    });

    test('should handle JSON wrapped in markdown', async () => {
      const mockResponse = {
        data: {
          response: '```json\n{"goal":"Test","steps":[]}\n```',
          model: 'codellama:13b',
          done: true
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const plan = await planManager.create('Test');
      expect(plan.goal).toBe('Test');
    });
  });

  describe('load', () => {
    test('should load saved plan', async () => {
      const plan = {
        goal: 'Test',
        steps: [],
        createdAt: new Date().toISOString()
      };
      await fs.mkdir(config.historyDirPath, { recursive: true });
      await fs.writeFile(config.planPath, JSON.stringify(plan, null, 2));
      
      const loaded = await planManager.load();
      expect(loaded.goal).toBe('Test');
    });

    test('should return null if no plan exists', async () => {
      const loaded = await planManager.load();
      expect(loaded).toBeNull();
    });
  });

  describe('execute', () => {
    test('should execute plan steps', async () => {
      const testFile = path.join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'initial');
      
      const plan = {
        goal: 'Test',
        steps: [
          { tool: 'read', args: { path: 'test.txt' } },
          { tool: 'write', args: { path: 'output.txt', content: 'done' } }
        ]
      };
      
      const result = await planManager.execute(plan);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].ok).toBe(true);
      expect(result.results[1].ok).toBe(true);
      
      const output = await fs.readFile(path.join(testDir, 'output.txt'), 'utf8');
      expect(output).toBe('done');
    });

    test('should stop on error by default', async () => {
      const plan = {
        goal: 'Test',
        steps: [
          { tool: 'read', args: { path: 'nonexistent.txt' } },
          { tool: 'write', args: { path: 'output.txt', content: 'done' } }
        ]
      };
      
      const result = await planManager.execute(plan);
      expect(result.results[0].ok).toBe(false);
      expect(result.failedAt).toBe(0);
      expect(result.results.length).toBe(1);
    });

    test('should continue on error if continueOnError=true', async () => {
      const plan = {
        goal: 'Test',
        steps: [
          { tool: 'read', args: { path: 'nonexistent.txt' } },
          { tool: 'write', args: { path: 'output.txt', content: 'done' } }
        ]
      };
      
      const result = await planManager.execute(plan, { continueOnError: true });
      expect(result.results).toHaveLength(2);
      expect(result.results[0].ok).toBe(false);
      expect(result.results[1].ok).toBe(true);
    });
  });

  describe('clear', () => {
    test('should delete plan file', async () => {
      await fs.mkdir(config.historyDirPath, { recursive: true });
      await fs.writeFile(config.planPath, '{}');
      await planManager.clear();
      const exists = await fs.access(config.planPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });
});
