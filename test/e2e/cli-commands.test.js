const { OllamaInterface } = require('../..');
const { mockEditResponse } = require('../utils/test-helpers');

describe('CLI Commands E2E', () => {
  let ollamaInterface;

  beforeEach(() => {
    ollamaInterface = new OllamaInterface({ rootPath: process.cwd() });
    jest.clearAllMocks();
  });

  describe('analyze command', () => {
    test('should analyze a file', async () => {
      // Mock the ollama client to avoid actual API calls in tests
      ollamaInterface.ollama.chat = jest.fn().mockResolvedValue({
        message: { content: 'Analysis result' }
      });

      const result = await ollamaInterface.analyzeCode('package.json');

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);
  });

  describe('summary command', () => {
    test('should get project summary', async () => {
      // Mock the ollama client
      ollamaInterface.ollama.chat = jest.fn().mockResolvedValue({
        message: { content: 'Project summary' }
      });

      const result = await ollamaInterface.getProjectSummary();

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);
  });

  describe('search command', () => {
    test('should search for code patterns', async () => {
      // Mock the ollama client
      ollamaInterface.ollama.chat = jest.fn().mockResolvedValue({
        message: { content: 'Search results' }
      });

      const result = await ollamaInterface.searchCode('function');

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);
  });

  describe('context command', () => {
    test('should get current context', () => {
      const context = ollamaInterface.getContext();

      expect(context).toBeDefined();
      expect(context).toHaveProperty('currentFiles');
      expect(context).toHaveProperty('projectSummary');
      expect(context).toHaveProperty('recentChanges');
      expect(context).toHaveProperty('conversationHistory');
    });
  });

  describe('models command', () => {
    test('should list available models', async () => {
      // Mock the ollama client list call
      ollamaInterface.ollama.list = jest.fn().mockResolvedValue({
        models: [{ name: 'codellama:13b', size: 7000000000 }]
      });

      const models = await ollamaInterface.listModels();

      expect(Array.isArray(models)).toBe(true);
      // If models are available, check structure
      if (models.length > 0) {
        expect(models[0]).toHaveProperty('name');
      }
    }, 30000);
  });

  describe('knowledge command', () => {
    test('should get knowledge base', async () => {
      const knowledge = await ollamaInterface.getKnowledge();

      // Can be null if doesn't exist, or string if exists
      expect(knowledge === null || typeof knowledge === 'string').toBe(true);
    }, 30000);
  });

  describe('clearContext command', () => {
    test('should clear context', () => {
      const context = ollamaInterface.getContext();
      context.currentFiles = [{ path: 'test.js', content: 'content', lines: 1, size: 10 }];
      context.recentChanges = [{ filePath: 'test.js', operation: 'create', timestamp: new Date() }];

      ollamaInterface.clearContext();

      const clearedContext = ollamaInterface.getContext();
      expect(clearedContext.currentFiles).toHaveLength(0);
      expect(clearedContext.recentChanges).toHaveLength(0);
      // History should not be cleared
      expect(clearedContext.conversationHistory).toBeDefined();
    });
  });
});
