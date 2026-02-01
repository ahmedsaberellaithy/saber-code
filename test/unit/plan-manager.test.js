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
    test('should create a valid plan', async () => {
      const mockResponse = {
        data: {
          response: JSON.stringify({
            goal: 'Test goal',
            steps: [
              { tool: 'read', args: { path: 'test.js' } }
            ]
          }),
          model: config.ollama.defaultModel,
          done: true
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await planManager.create('Test goal');
      expect(result).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.plan.goal).toBe('Test goal');
      expect(result.plan.steps).toHaveLength(1);
      expect(result.plan.steps[0].tool).toBe('read');
      expect(result.plan.createdAt).toBeDefined();
      expect(result.planPath).toBeDefined();
      expect(result.filename).toContain('test-goal');
    });

    test('should handle JSON wrapped in markdown', async () => {
      const mockResponse = {
        data: {
          response: '```json\n{"goal":"Create test file","steps":[{"tool":"write","args":{"path":"test.txt","content":"hello"}}]}\n```',
          model: config.ollama.defaultModel,
          done: true
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await planManager.create('Create test file');
      expect(result.plan.goal).toBe('Create test file');
      expect(result.plan.steps).toHaveLength(1);
    });

    test('should reject plan with placeholder values', async () => {
      const mockResponse = {
        data: {
          response: JSON.stringify({
            goal: '<goal string>',
            steps: [
              { tool: 'read', args: { path: '...' } }
            ]
          }),
          model: config.ollama.defaultModel,
          done: true
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await expect(planManager.create('Vague goal')).rejects.toThrow(/validation failed/);
    });
  });

  describe('load', () => {
    test('should load latest plan from _saber_code_plans directory', async () => {
      const plan = {
        goal: 'Test plan',
        steps: [{ tool: 'list', args: { path: '.' } }],
        createdAt: new Date().toISOString()
      };
      await fs.mkdir(planManager._plansDir, { recursive: true });
      const planPath = path.join(planManager._plansDir, 'test-plan-20260122-120000.json');
      await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
      
      const result = await planManager.load(planPath);
      expect(result).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.plan.goal).toBe('Test plan');
      expect(result.plan.steps).toHaveLength(1);
      expect(result.planPath).toBe(planPath);
      
      // Cleanup
      await fs.unlink(planPath).catch(() => {});
    });

    test('should return null if plan file does not exist', async () => {
      const loaded = await planManager.load('nonexistent-plan.json');
      expect(loaded).toBeNull();
    });

    test('should find latest plan when no path specified', async () => {
      await fs.mkdir(planManager._plansDir, { recursive: true });
      const plan = {
        goal: 'Latest plan',
        steps: [{ tool: 'write', args: { path: 'test.txt', content: 'test' } }],
        createdAt: new Date().toISOString()
      };
      const planPath = path.join(planManager._plansDir, 'latest-20260122-120000.json');
      await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
      
      const result = await planManager.load();
      expect(result).toBeDefined();
      expect(result.plan).toBeDefined();
      
      // Cleanup
      await fs.unlink(planPath).catch(() => {});
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
    test('should delete all plan files in _saber_code_plans directory', async () => {
      await fs.mkdir(planManager._plansDir, { recursive: true });
      const planPath = path.join(planManager._plansDir, 'test-plan-20260122-120000.json');
      await fs.writeFile(planPath, '{}');
      
      await planManager.clear();
      
      const exists = await fs.access(planPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });
});
