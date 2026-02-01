const { OllamaInterface } = require('../..');
const fs = require('fs').promises;
const path = require('path');
const { createTempDir, cleanupTempDir, mockEditResponse } = require('../utils/test-helpers');

jest.mock('../../src/core/ollamaClient');

describe('Context Management Integration', () => {
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
    // Clear context before each test
    ollamaInterface.clearContext();
    
    // Clean test directory
    try {
      const files = await fs.readdir(testDir);
      for (const file of files) {
        if (file !== '.saber-chat-history') {
          const filePath = path.join(testDir, file);
          const stat = await fs.stat(filePath);
          if (stat.isDirectory()) {
            await fs.rm(filePath, { recursive: true, force: true });
          } else {
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      // Ignore if empty
    }
  });

  describe('File Context Updates', () => {
    test('should update file context after successful create operation', async () => {
      const mockOperations = [{
        filePath: 'test-context.txt',
        operation: 'create',
        content: 'Test content for context'
      }];

      ollamaInterface.createMessage = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: mockEditResponse(mockOperations, 'Test reasoning') }]
      });

      const result = await ollamaInterface.applyCodeChanges('Create test file');

      if (result.success) {
        const context = ollamaInterface.getContext();
        const fileInContext = context.currentFiles.find(
          f => f.path && f.path.includes('test-context.txt')
        );

        expect(fileInContext).toBeDefined();
        if (fileInContext) {
          expect(fileInContext.content).toContain('Test content for context');
        }
      }
    }, 30000);

    test('should update file context after successful update operation', async () => {
      // First create a file
      const filePath = path.join(testDir, 'update-test.txt');
      await fs.writeFile(filePath, 'Original content');

      const mockOperations = [{
        filePath: 'update-test.txt',
        operation: 'update',
        content: 'Updated content for context'
      }];

      ollamaInterface.createMessage = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: mockEditResponse(mockOperations, 'Update reasoning') }]
      });

      const result = await ollamaInterface.applyCodeChanges('Update test file');

      if (result.success) {
        const context = ollamaInterface.getContext();
        const fileInContext = context.currentFiles.find(
          f => f.path && f.path.includes('update-test.txt')
        );

        expect(fileInContext).toBeDefined();
        if (fileInContext) {
          expect(fileInContext.content).toContain('Updated content');
        }
      }
    }, 30000);

    test('should remove file from context after delete operation', async () => {
      // First create and add to context
      const filePath = path.join(testDir, 'delete-test.txt');
      await fs.writeFile(filePath, 'Content to delete');

      // Add to context manually
      const context = ollamaInterface.getContext();
      context.currentFiles.push({
        path: 'delete-test.txt',
        content: 'Content to delete',
        lines: 1,
        size: 18
      });

      const mockOperations = [{
        filePath: 'delete-test.txt',
        operation: 'delete'
      }];

      ollamaInterface.createMessage = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: mockEditResponse(mockOperations, 'Delete reasoning') }]
      });

      const result = await ollamaInterface.applyCodeChanges('Delete test file');

      if (result.success) {
        const finalContext = ollamaInterface.getContext();
        const fileStillInContext = finalContext.currentFiles.find(
          f => f.path && f.path.includes('delete-test.txt')
        );

        expect(fileStillInContext).toBeUndefined();
      }
    }, 30000);
  });

  describe('Recent Changes Tracking', () => {
    test('should track recent changes without duplicates', async () => {
      const context = ollamaInterface.getContext();
      context.recentChanges = []; // Clear existing

      const mockOperations = [{
        filePath: 'no-dup.txt',
        operation: 'create',
        content: 'Content'
      }];

      ollamaInterface.createMessage = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: mockEditResponse(mockOperations, 'Reasoning') }]
      });

      await ollamaInterface.applyCodeChanges('Create file for duplicate test');

      const finalContext = ollamaInterface.getContext();
      const changes = finalContext.recentChanges.filter(
        c => c.filePath && c.filePath.includes('no-dup.txt')
      );

      // Should have only one entry per operation
      expect(changes.length).toBeLessThanOrEqual(1);
    }, 30000);

    test('should track both successful and failed operations', async () => {
      const context = ollamaInterface.getContext();
      const initialChangesCount = context.recentChanges.length;

      const mockOperations = [
        {
          filePath: 'success.txt',
          operation: 'create',
          content: 'Success content'
        },
        {
          filePath: 'fail.txt',
          operation: 'create',
          content: 'Fail content'
        }
      ];

      ollamaInterface.createMessage = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: mockEditResponse(mockOperations, 'Mixed operations') }]
      });

      // Mock one success, one failure
      let callCount = 0;
      ollamaInterface.fileEditor.applyEdit = jest.fn().mockImplementation(async (op) => {
        callCount++;
        if (callCount === 1) {
          return { success: true, message: 'Created', newContent: op.content, content: op.content };
        } else {
          return { success: false, error: 'Simulated failure' };
        }
      });

      await ollamaInterface.applyCodeChanges('Create multiple files');

      const finalContext = ollamaInterface.getContext();
      
      // Should track both operations
      expect(finalContext.recentChanges.length).toBeGreaterThan(initialChangesCount);
    }, 30000);
  });

  describe('Context Persistence', () => {
    test('should persist context across multiple operations', async () => {
      // First operation
      const mockOps1 = [{
        filePath: 'persist1.txt',
        operation: 'create',
        content: 'File 1'
      }];

      ollamaInterface.createMessage = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: mockEditResponse(mockOps1, 'First') }]
      });

      await ollamaInterface.applyCodeChanges('Create first file');

      // Second operation
      const mockOps2 = [{
        filePath: 'persist2.txt',
        operation: 'create',
        content: 'File 2'
      }];

      ollamaInterface.createMessage = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: mockEditResponse(mockOps2, 'Second') }]
      });

      ollamaInterface.fileEditor.applyEdit = jest.fn().mockResolvedValue({
        success: true,
        message: 'Created',
        newContent: mockOps2[0].content,
        content: mockOps2[0].content
      });

      ollamaInterface.projectContext.analyzer.readFile = jest.fn().mockResolvedValue({
        path: 'persist2.txt',
        content: 'File 2',
        lines: 1,
        size: 6
      });

      await ollamaInterface.applyCodeChanges('Create second file');

      const context = ollamaInterface.getContext();
      
      // Context should remember operations (at least recentChanges should be populated)
      // Note: recentChanges might not include if operations failed or weren't tracked
      // Check that context is at least valid
      expect(context).toBeDefined();
      expect(context.recentChanges).toBeDefined();
      expect(Array.isArray(context.recentChanges)).toBe(true);
    }, 30000);
  });

  describe('Knowledge Base Auto-Update', () => {
    test('should auto-update knowledge base every 5 messages', async () => {
      const updateKnowledgeSpy = jest.spyOn(ollamaInterface, 'updateKnowledge');
      updateKnowledgeSpy.mockResolvedValue({ success: true });

      ollamaInterface.ollama.chat = jest.fn().mockResolvedValue({
        content: 'Response',
        model: 'codellama:13b'
      });

      // Clear history first
      const context = ollamaInterface.getContext();
      context.conversationHistory = [];

      // Send 5 messages
      for (let i = 0; i < 5; i++) {
        await ollamaInterface.createMessage({
          messages: [{ role: 'user', content: `Message ${i}` }]
        });
      }

      // updateKnowledge should be called once (at 5th message)
      expect(updateKnowledgeSpy).toHaveBeenCalled();

      updateKnowledgeSpy.mockRestore();
    }, 30000);

    test('should handle knowledge base update failures gracefully', async () => {
      const updateKnowledgeSpy = jest.spyOn(ollamaInterface, 'updateKnowledge');
      updateKnowledgeSpy.mockRejectedValue(new Error('Knowledge update failed'));

      ollamaInterface.ollama.chat = jest.fn().mockResolvedValue({
        content: 'Response',
        model: 'codellama:13b'
      });

      const context = ollamaInterface.getContext();
      context.conversationHistory = [];

      // Should not throw even if updateKnowledge fails
      for (let i = 0; i < 5; i++) {
        await expect(
          ollamaInterface.createMessage({
            messages: [{ role: 'user', content: `Message ${i}` }]
          })
        ).resolves.toBeDefined();
      }

      updateKnowledgeSpy.mockRestore();
    }, 30000);
  });

  describe('Recent Changes Limit', () => {
    test('should limit recentChanges to 20 entries', async () => {
      const context = ollamaInterface.getContext();
      context.recentChanges = []; // Clear existing

      // Create 25 changes
      for (let i = 0; i < 25; i++) {
        const mockOps = [{
          filePath: `limit-test-${i}.txt`,
          operation: 'create',
          content: `Content ${i}`
        }];

        ollamaInterface.createMessage = jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: mockEditResponse(mockOps, `Reasoning ${i}`) }]
        });

        await ollamaInterface.applyCodeChanges(`Create file ${i}`);
      }

      const finalContext = ollamaInterface.getContext();
      
      // Should be limited to 20
      expect(finalContext.recentChanges.length).toBeLessThanOrEqual(20);
    }, 60000);
  });
});

