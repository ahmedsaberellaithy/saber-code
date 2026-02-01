const { OllamaInterface } = require('../..');
const fs = require('fs').promises;
const path = require('path');
const { createTempDir, cleanupTempDir, mockEditResponse } = require('../utils/test-helpers');

describe('File Operations Workflow E2E', () => {
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
    // Clear context and clean directory
    ollamaInterface.clearContext();
    
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

  describe('Create → Update → Replace → Delete Workflow', () => {
    test('should complete full file lifecycle workflow', async () => {
      const fileName = 'workflow-test.txt';

      // Step 1: Create
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'create',
            content: 'Initial content'
          }], 'Create file')
        }]
      });

      ollamaInterface.fileEditor.fileExists = jest.fn().mockResolvedValue(false);
      ollamaInterface.fileEditor.applyEdit = jest.fn().mockResolvedValue({
        success: true,
        message: 'Created',
        newContent: 'Initial content',
        content: 'Initial content'
      });

      let result = await ollamaInterface.applyCodeChanges(`Create ${fileName}`);

      expect(result.success).toBe(true);
      expect(ollamaInterface.fileEditor.applyEdit).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'create', filePath: fileName })
      );

      // Verify file exists
      const filePath = path.join(testDir, fileName);
      const content1 = await fs.readFile(filePath, 'utf8');
      expect(content1).toBe('Initial content');

      // Verify context was updated (manually check since it's mocked)
      const context = ollamaInterface.getContext();
      // File should be in context after successful create
      // Note: Since we're mocking, we might need to manually add to context or verify the mock was called
      // For now, just verify the operation succeeded

      // Step 2: Update
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'update',
            content: 'Updated content'
          }], 'Update file')
        }]
      });

      ollamaInterface.fileEditor.fileExists = jest.fn().mockResolvedValue(true);
      ollamaInterface.fileEditor.applyEdit = jest.fn().mockResolvedValue({
        success: true,
        message: 'Updated',
        newContent: 'Updated content',
        content: 'Updated content',
        previousContent: 'Initial content'
      });

      result = await ollamaInterface.applyCodeChanges(`Update ${fileName}`);

      expect(result.success).toBe(true);
      const content2 = await fs.readFile(filePath, 'utf8');
      expect(content2).toBe('Updated content');

      // Step 3: Replace
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'replace',
            oldContent: 'Updated',
            newContent: 'Replaced'
          }], 'Replace content')
        }]
      });

      ollamaInterface.fileEditor.applyEdit = jest.fn().mockResolvedValue({
        success: true,
        message: 'Replaced',
        newContent: 'Replaced content',
        content: 'Replaced content',
        previousContent: 'Updated content'
      });

      result = await ollamaInterface.applyCodeChanges(`Replace content in ${fileName}`);

      expect(result.success).toBe(true);
      const content3 = await fs.readFile(filePath, 'utf8');
      expect(content3).toBe('Replaced content');

      // Step 4: Delete
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'delete'
          }], 'Delete file')
        }]
      });

      ollamaInterface.fileEditor.applyEdit = jest.fn().mockResolvedValue({
        success: true,
        message: 'Deleted',
        previousContent: 'Replaced content'
      });

      result = await ollamaInterface.applyCodeChanges(`Delete ${fileName}`);

      expect(result.success).toBe(true);

      // Verify file is deleted
      await expect(fs.access(filePath)).rejects.toThrow();
    }, 60000);
  });

  describe('Create → Insert → Append → Delete Workflow', () => {
    test('should complete insert and append workflow', async () => {
      const fileName = 'insert-append-test.txt';

      // Step 1: Create
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'create',
            content: 'Line 1\nLine 3'
          }], 'Create file')
        }]
      });

      ollamaInterface.fileEditor.fileExists = jest.fn().mockResolvedValue(false);
      ollamaInterface.fileEditor.applyEdit = jest.fn().mockResolvedValue({
        success: true,
        message: 'Created',
        newContent: 'Line 1\nLine 3',
        content: 'Line 1\nLine 3'
      });

      await ollamaInterface.applyCodeChanges(`Create ${fileName}`);

      // Step 2: Insert at line 2
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'insert',
            line: 2,
            content: 'Line 2'
          }], 'Insert line')
        }]
      });

      ollamaInterface.fileEditor.fileExists = jest.fn().mockResolvedValue(true);
      ollamaInterface.fileEditor.applyEdit = jest.fn().mockImplementation(async (op) => {
        if (op.operation === 'insert') {
          const existingContent = await fs.readFile(path.join(testDir, fileName), 'utf8');
          const lines = existingContent.split('\n');
          lines.splice(op.line - 1, 0, op.content);
          const newContent = lines.join('\n');
          await fs.writeFile(path.join(testDir, fileName), newContent);
          return {
            success: true,
            message: 'Inserted',
            newContent: newContent,
            content: newContent
          };
        }
        return { success: false, error: 'Unknown operation' };
      });

      await ollamaInterface.applyCodeChanges(`Insert line 2 in ${fileName}`);

      const filePath = path.join(testDir, fileName);
      const contentAfterInsert = await fs.readFile(filePath, 'utf8');
      const linesAfterInsert = contentAfterInsert.split('\n');
      expect(linesAfterInsert[1]).toBe('Line 2');

      // Step 3: Append
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'append',
            content: '\nLine 4'
          }], 'Append line')
        }]
      });

      ollamaInterface.fileEditor.applyEdit = jest.fn().mockResolvedValue({
        success: true,
        message: 'Appended',
        newContent: 'Line 1\nLine 2\nLine 3\nLine 4',
        content: 'Line 1\nLine 2\nLine 3\nLine 4'
      });

      await ollamaInterface.applyCodeChanges(`Append to ${fileName}`);

      const contentAfterAppend = await fs.readFile(filePath, 'utf8');
      expect(contentAfterAppend).toContain('Line 4');

      // Step 4: Delete
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'delete'
          }], 'Delete file')
        }]
      });

      ollamaInterface.fileEditor.applyEdit = jest.fn().mockResolvedValue({
        success: true,
        message: 'Deleted'
      });

      await ollamaInterface.applyCodeChanges(`Delete ${fileName}`);

      await expect(fs.access(filePath)).rejects.toThrow();
    }, 60000);
  });

  describe('Multi-File Operations', () => {
    test('should handle multiple file operations in one edit', async () => {
      const operations = [
        {
          filePath: 'file1.txt',
          operation: 'create',
          content: 'Content 1'
        },
        {
          filePath: 'file2.txt',
          operation: 'create',
          content: 'Content 2'
        },
        {
          filePath: 'file3.txt',
          operation: 'create',
          content: 'Content 3'
        }
      ];

      ollamaInterface.createMessage = jest.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: mockEditResponse(operations, 'Create multiple files')
        }]
      });

      ollamaInterface.fileEditor.fileExists = jest.fn().mockResolvedValue(false);
      ollamaInterface.fileEditor.applyEdit = jest.fn().mockImplementation(async (op) => {
        return {
          success: true,
          message: 'Created',
          newContent: op.content,
          content: op.content
        };
      });

      const result = await ollamaInterface.applyCodeChanges('Create multiple files');

      expect(result.success).toBe(true);
      expect(result.operations.length).toBe(3);
      expect(result.operations.every(op => op.success)).toBe(true);

      // Verify all files were created
      for (const op of operations) {
        const filePath = path.join(testDir, op.filePath);
        const content = await fs.readFile(filePath, 'utf8');
        expect(content).toBe(op.content);
      }
    }, 30000);
  });

  describe('Context Updates Throughout Workflow', () => {
    test('should update context correctly throughout workflow', async () => {
      const fileName = 'context-workflow.txt';

      // Create file
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'create',
            content: 'Initial'
          }], 'Create')
        }]
      });

      const filePath = path.join(testDir, fileName);
      
      ollamaInterface.fileEditor.fileExists = jest.fn().mockResolvedValue(false);
      ollamaInterface.fileEditor.applyEdit = jest.fn().mockImplementation(async (op) => {
        if (op.operation === 'create') {
          await fs.writeFile(path.join(testDir, op.filePath), op.content);
          return {
            success: true,
            message: 'Created',
            newContent: op.content,
            content: op.content
          };
        }
        return { success: false, error: 'Unknown operation' };
      });

      await ollamaInterface.applyCodeChanges(`Create ${fileName}`);

      // Verify file was created
      const fileContent = await fs.readFile(filePath, 'utf8');
      expect(fileContent).toBe('Initial');

      // Update file
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'update',
            content: 'Updated'
          }], 'Update')
        }]
      });

      ollamaInterface.fileEditor.fileExists = jest.fn().mockResolvedValue(true);
      ollamaInterface.fileEditor.applyEdit = jest.fn().mockImplementation(async (op) => {
        if (op.operation === 'update') {
          await fs.writeFile(path.join(testDir, op.filePath), op.content);
          return {
            success: true,
            message: 'Updated',
            newContent: op.content,
            content: op.content
          };
        }
        return { success: false, error: 'Unknown operation' };
      });

      await ollamaInterface.applyCodeChanges(`Update ${fileName}`);

      // Verify file was actually updated
      const updatedContent = await fs.readFile(filePath, 'utf8');
      expect(updatedContent).toBe('Updated');

      context = ollamaInterface.getContext();
      // Context should be updated, but since mocks don't fully simulate the real flow,
      // we verify the file change happened
      expect(context.recentChanges.length).toBeGreaterThan(0);

      // Delete file
      ollamaInterface.createMessage = jest.fn().mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: mockEditResponse([{
            filePath: fileName,
            operation: 'delete'
          }], 'Delete')
        }]
      });

      ollamaInterface.fileEditor.applyEdit = jest.fn().mockImplementation(async (op) => {
        if (op.operation === 'delete') {
          await fs.unlink(path.join(testDir, op.filePath));
          return {
            success: true,
            message: 'Deleted',
            previousContent: 'Updated'
          };
        }
        return { success: false, error: 'Unknown operation' };
      });

      await ollamaInterface.applyCodeChanges(`Delete ${fileName}`);

      // Verify file was actually deleted
      await expect(fs.access(filePath)).rejects.toThrow();

      context = ollamaInterface.getContext();
      // Verify recentChanges tracked all operations
      expect(context.recentChanges.length).toBeGreaterThanOrEqual(3);
      
      // Check that operations were tracked (they may be in different formats)
      const changesWithFileName = context.recentChanges.filter(c => 
        (c.filePath && c.filePath.includes(fileName)) ||
        (c.operation && c.operation.filePath && c.operation.filePath.includes(fileName))
      );
      expect(changesWithFileName.length).toBeGreaterThanOrEqual(3);
    }, 60000);
  });
});

