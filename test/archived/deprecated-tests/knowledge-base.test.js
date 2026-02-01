const { OllamaInterface } = require('../..');
const fs = require('fs').promises;
const path = require('path');
const { createTempDir, cleanupTempDir } = require('../utils/test-helpers');

describe('Knowledge Base Integration', () => {
  let ollamaInterface;
  let testDir;

  beforeAll(async () => {
    testDir = await createTempDir();
    ollamaInterface = new OllamaInterface({ rootPath: testDir });
    await ollamaInterface.initialize();
  });

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  beforeEach(async () => {
    // Clear knowledge base before each test
    const knowledgeFile = path.join(testDir, '.saber-chat-history', 'intro_to_project.md');
    try {
      await fs.unlink(knowledgeFile);
    } catch (error) {
      // Ignore if doesn't exist
    }
  });

  describe('Knowledge Base Creation', () => {
    test('should create knowledge base on update', async () => {
      const result = await ollamaInterface.updateKnowledge();

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();

      const knowledgeFile = path.join(testDir, '.saber-chat-history', 'intro_to_project.md');
      const exists = await fs.access(knowledgeFile).then(() => true).catch(() => false);

      expect(exists).toBe(true);
    }, 30000);

    test('should generate knowledge base with project summary', async () => {
      await ollamaInterface.updateKnowledge();

      const knowledge = await ollamaInterface.getKnowledge();

      expect(knowledge).toBeDefined();
      expect(knowledge).toContain('# Project Knowledge Base');
      expect(knowledge).toContain('Project Overview');
    }, 30000);
  });

  describe('Knowledge Base Loading', () => {
    test('should load existing knowledge base', async () => {
      // Create knowledge base first
      const knowledgeContent = '# Test Knowledge\n\nTest content.';
      await ollamaInterface.projectContext.saveKnowledge(knowledgeContent);

      const loaded = await ollamaInterface.getKnowledge();

      expect(loaded).toBe(knowledgeContent);
    });

    test('should return null if knowledge base does not exist', async () => {
      // Ensure knowledge file doesn't exist
      const knowledgeFile = path.join(testDir, '.saber-chat-history', 'intro_to_project.md');
      try {
        await fs.unlink(knowledgeFile);
      } catch (error) {
        // Ignore
      }

      const loaded = await ollamaInterface.getKnowledge();

      expect(loaded).toBeNull();
    });
  });

  describe('Knowledge Base Generation', () => {
    test('should include project summary in knowledge base', async () => {
      const context = ollamaInterface.getContext();
      context.projectSummary = {
        projectName: 'test-project',
        fileCount: 10,
        fileTypes: { '.js': 5 },
        description: 'Test description',
        dependencies: ['express', 'axios'],
        scripts: { start: 'node index.js' },
        configFiles: ['package.json']
      };

      await ollamaInterface.updateKnowledge();

      const knowledge = await ollamaInterface.getKnowledge();

      expect(knowledge).toContain('test-project');
      expect(knowledge).toContain('10');
      expect(knowledge).toContain('express');
      expect(knowledge).toContain('axios');
    }, 30000);

    test('should include recent development discussions', async () => {
      // Add conversation history
      const context = ollamaInterface.getContext();
      context.conversationHistory = [
        { role: 'user', content: 'What is this project?', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'This is a test project.', timestamp: new Date().toISOString() }
      ];

      await ollamaInterface.updateKnowledge();

      const knowledge = await ollamaInterface.getKnowledge();

      expect(knowledge).toContain('Recent Development Discussions');
      expect(knowledge).toContain('What is this project?');
    }, 30000);

    test('should include recent changes in knowledge base', async () => {
      const context = ollamaInterface.getContext();
      context.recentChanges = [
        {
          filePath: 'test.js',
          operation: { filePath: 'test.js', operation: 'create' },
          result: { success: true },
          timestamp: new Date()
        }
      ];

      await ollamaInterface.updateKnowledge();

      const knowledge = await ollamaInterface.getKnowledge();

      expect(knowledge).toContain('Recent Changes');
      expect(knowledge).toContain('test.js');
      expect(knowledge).toContain('create');
    }, 30000);
  });

  describe('Knowledge Base Refresh', () => {
    test('should refresh knowledge base with current context', async () => {
      // Create initial knowledge base
      await ollamaInterface.updateKnowledge();

      // Update context
      const context = ollamaInterface.getContext();
      context.projectSummary = {
        projectName: 'updated-project',
        fileCount: 20,
        fileTypes: {},
        description: 'Updated description',
        dependencies: [],
        scripts: {},
        configFiles: []
      };

      // Refresh knowledge base
      const result = await ollamaInterface.refreshKnowledge();

      expect(result.success).toBe(true);

      const updatedKnowledge = await ollamaInterface.getKnowledge();

      expect(updatedKnowledge).toContain('updated-project');
      expect(updatedKnowledge).toContain('20');
    }, 30000);

    test('should handle refresh errors gracefully', async () => {
      // Mock projectContext.updateKnowledgeBase to fail
      const originalUpdate = ollamaInterface.projectContext.updateKnowledgeBase.bind(ollamaInterface.projectContext);
      ollamaInterface.projectContext.updateKnowledgeBase = jest.fn().mockRejectedValue(new Error('Update failed'));

      const result = await ollamaInterface.refreshKnowledge();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore original method
      ollamaInterface.projectContext.updateKnowledgeBase = originalUpdate;
    });
  });

  describe('Knowledge Base Persistence', () => {
    test('should persist knowledge base across sessions', async () => {
      // Create knowledge base in first session
      const knowledgeContent = '# Persistent Knowledge\n\nThis should persist.';
      await ollamaInterface.projectContext.saveKnowledge(knowledgeContent);

      // Create new interface instance (simulating new session)
      const newInterface = new OllamaInterface({ rootPath: testDir });
      await newInterface.initialize();

      const loaded = await newInterface.getKnowledge();

      expect(loaded).toBe(knowledgeContent);
    }, 30000);

    test('should handle knowledge base generation with various project states', async () => {
      // Test with minimal project state
      const context = ollamaInterface.getContext();
      context.projectSummary = {
        projectName: 'minimal-project',
        fileCount: 0,
        fileTypes: {},
        description: '',
        dependencies: [],
        scripts: {},
        configFiles: []
      };
      context.conversationHistory = [];
      context.recentChanges = [];

      await ollamaInterface.updateKnowledge();

      const knowledge = await ollamaInterface.getKnowledge();

      expect(knowledge).toBeDefined();
      expect(knowledge).toContain('minimal-project');
      expect(knowledge).toContain('# Project Knowledge Base');
    }, 30000);
  });
});

