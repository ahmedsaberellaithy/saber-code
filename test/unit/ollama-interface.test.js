const OllamaInterface = require('../../src/core/ollamaInterface');

describe('OllamaInterface', () => {
  let ollamaInterface;

  beforeEach(() => {
    ollamaInterface = new OllamaInterface();
  });

  test('should initialize with default options', () => {
    expect(ollamaInterface.ollama.defaultModel).toBe('codellama:13b');
    expect(ollamaInterface.defaultOptions.temperature).toBe(0.7);
  });

  test('should have messages API', () => {
    expect(typeof ollamaInterface.messages.create).toBe('function');
  });

  test('should have all required methods', () => {
    const requiredMethods = [
      'initialize',
      'createMessage',
      'complete',
      'analyzeCode',
      'getProjectSummary',
      'applyCodeChanges',
      'searchCode',
      'updateKnowledge',
      'getKnowledge',
      'loadFiles',
      'listModels',
      'getContext',
      'clearContext',
      'refreshKnowledge',
      'getModelInfo'
    ];

    requiredMethods.forEach(method => {
      expect(typeof ollamaInterface[method]).toBe('function');
    });
  });
});
