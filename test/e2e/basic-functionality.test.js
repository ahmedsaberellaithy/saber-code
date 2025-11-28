const { OllamaInterface } = require('../..');
const chalk = require('chalk');

describe('Basic Functionality E2E Tests', () => {
  let ollama;

  beforeAll(async () => {
    ollama = new OllamaInterface();
  });

  test('should initialize correctly', async () => {
    const context = await ollama.initialize();
    expect(context).toBeDefined();
    expect(typeof context).toBe('object');
    expect(context.projectSummary).toBeDefined();
  }, 30000);

  test('should complete basic prompts', async () => {
    const result = await ollama.complete('Say "Test passed!"');
    expect(result).toBeDefined();
    expect(result.completion).toBeDefined();
    expect(typeof result.completion).toBe('string');
  }, 30000);

  test('should support messages API', async () => {
    const result = await ollama.messages.create({
      messages: [{ role: 'user', content: 'Hello' }]
    });
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  }, 30000);

  test('should manage context', async () => {
    const context = ollama.getContext();
    expect(context).toBeDefined();
    expect(typeof context).toBe('object');
    expect(context.conversationHistory).toBeDefined();
  });
});
