const { ContextManager } = require('../../src/core/ContextManager');
const { Config } = require('../../src/core/Config');
const { TokenCounter } = require('../../src/core/TokenCounter');

describe('ContextManager', () => {
  let config;
  let contextManager;
  let tokenCounter;

  beforeEach(async () => {
    config = new Config(process.cwd());
    await config.load();
    tokenCounter = new TokenCounter();
    contextManager = new ContextManager(config, tokenCounter);
  });

  describe('addFile', () => {
    test('should add file to context', () => {
      contextManager.addFile('test.js', 'const x = 1;');
      const files = contextManager.getFiles();
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('test.js');
      expect(files[0].content).toBe('const x = 1;');
    });

    test('should limit files to maxFilesInContext', () => {
      const max = config.limits.maxFilesInContext || 20;
      for (let i = 0; i < max + 5; i++) {
        contextManager.addFile(`file${i}.js`, 'content');
      }
      const files = contextManager.getFiles();
      expect(files.length).toBeLessThanOrEqual(max);
    });
  });

  describe('addMessage', () => {
    test('should add message to history', () => {
      contextManager.addMessage('user', 'Hello');
      contextManager.addMessage('assistant', 'Hi there');
      const messages = contextManager.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    test('should limit messages to maxConversationMessages', () => {
      const max = config.context.maxConversationMessages || 50;
      for (let i = 0; i < max + 10; i++) {
        contextManager.addMessage('user', `Message ${i}`);
      }
      const messages = contextManager.getMessages();
      expect(messages.length).toBeLessThanOrEqual(max);
    });
  });

  describe('addRecentChange', () => {
    test('should track recent changes', () => {
      contextManager.addRecentChange({ path: 'test.js', operation: 'write' });
      const changes = contextManager.getRecentChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].path).toBe('test.js');
    });

    test('should limit changes to maxRecentChanges', () => {
      const max = config.context.maxRecentChanges || 20;
      for (let i = 0; i < max + 5; i++) {
        contextManager.addRecentChange({ path: `file${i}.js`, operation: 'edit' });
      }
      const changes = contextManager.getRecentChanges();
      expect(changes.length).toBeLessThanOrEqual(max);
    });
  });

  describe('getContextForPrompt', () => {
    test('should build context string with files', () => {
      contextManager.addFile('test.js', 'const x = 1;');
      const { text, tokens } = contextManager.getContextForPrompt(1000);
      expect(text).toContain('test.js');
      expect(text).toContain('const x = 1;');
      expect(tokens).toBeGreaterThan(0);
    });

    test('should truncate if over token limit', () => {
      const longContent = 'x'.repeat(10000);
      contextManager.addFile('large.js', longContent);
      const { text, tokens } = contextManager.getContextForPrompt(100);
      expect(tokens).toBeLessThanOrEqual(100);
      expect(text.length).toBeLessThan(longContent.length);
    });

    test('should include recent changes', () => {
      contextManager.addRecentChange({ path: 'test.js', operation: 'write' });
      const { text } = contextManager.getContextForPrompt(1000);
      expect(text).toContain('Recent changes');
      expect(text).toContain('test.js');
    });

    test('should include recent conversation', () => {
      contextManager.addMessage('user', 'Hello');
      contextManager.addMessage('assistant', 'Hi');
      const { text } = contextManager.getContextForPrompt(1000);
      expect(text).toContain('Recent conversation');
    });
  });

  describe('clear', () => {
    test('should clear all context', () => {
      contextManager.addFile('test.js', 'content');
      contextManager.addMessage('user', 'Hello');
      contextManager.addRecentChange({ path: 'test.js' });
      contextManager.clear();
      expect(contextManager.getFiles()).toHaveLength(0);
      expect(contextManager.getMessages()).toHaveLength(0);
      expect(contextManager.getRecentChanges()).toHaveLength(0);
    });
  });
});
