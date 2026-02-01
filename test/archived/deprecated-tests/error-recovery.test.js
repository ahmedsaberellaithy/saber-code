const { OllamaInterface } = require('../..');
const fs = require('fs').promises;
const path = require('path');
const { createTempDir, cleanupTempDir, mockInvalidResponse } = require('../utils/test-helpers');

describe('Error Recovery Integration', () => {
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
  });

  describe('Failed Edit Operations', () => {
    test('should recover from failed file operations', async () => {
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
        content: [{
          type: 'text',
          text: JSON.stringify({
            reasoning: 'Mixed operations',
            operations: mockOperations
          })
        }]
      });

      // Mock first success, second failure
      let callCount = 0;
      ollamaInterface.fileEditor.applyEdit = jest.fn().mockImplementation(async (op) => {
        callCount++;
        if (callCount === 1) {
          return { success: true, message: 'Created', newContent: op.content, content: op.content };
        } else {
          return { success: false, error: 'Permission denied' };
        }
      });

      ollamaInterface.fileEditor.fileExists = jest.fn().mockResolvedValue(false);
      
      // Mock analyzer.readFile so updateFileContext can read the file
      ollamaInterface.projectContext.analyzer.readFile = jest.fn().mockImplementation(async (filePath) => {
        if (filePath.includes('success.txt')) {
          return {
            path: filePath,
            content: 'Success content',
            lines: 1,
            size: 15
          };
        }
        throw new Error('File not found');
      });

      const result = await ollamaInterface.applyCodeChanges('Create multiple files');

      expect(result.success).toBe(false); // Overall failed due to one failure
      expect(result.operations.length).toBe(2);
      expect(result.operations[0].success).toBe(true);
      expect(result.operations[1].success).toBe(false);

      // Context should only have successful operation
      const context = ollamaInterface.getContext();
      const successFile = context.currentFiles.find(f => f.path && f.path.includes('success.txt'));
      const failFile = context.currentFiles.find(f => f.path && f.path.includes('fail.txt'));

      expect(successFile).toBeDefined();
      expect(failFile).toBeUndefined();
    }, 30000);
  });

  describe('Malformed AI Responses', () => {
    test('should handle invalid JSON responses', async () => {
      ollamaInterface.createMessage = jest.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: mockInvalidResponse() // Invalid JSON
        }]
      });

      const result = await ollamaInterface.applyCodeChanges('Test edit');

      expect(result.success).toBe(false);
      expect(result.parsingError).toBe(true);
      expect(result.error).toContain('parse');
      expect(result.rawResponse).toBeDefined();
    }, 30000);

    test('should handle empty operations array', async () => {
      ollamaInterface.createMessage = jest.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            reasoning: 'Test',
            operations: []
          })
        }]
      });

      const result = await ollamaInterface.applyCodeChanges('Test edit');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty operations array');
      expect(result.parsingError).toBe(false);
    }, 30000);
  });
});
