const FileEditor = require('../../src/core/fileEditor');
const fs = require('fs').promises;
const path = require('path');

describe('FileEditor', () => {
  let fileEditor;
  const testDir = path.join(__dirname, 'test-temp');

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    fileEditor = new FileEditor(testDir);
  });

  afterAll(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean test directory before each test
    const files = await fs.readdir(testDir);
    for (const file of files) {
      await fs.unlink(path.join(testDir, file));
    }
  });

  test('should create a file', async () => {
    const result = await fileEditor.applyEdit({
      filePath: 'test.txt',
      operation: 'create',
      content: 'Hello World'
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Created file');

    const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf8');
    expect(content).toBe('Hello World');
  });

  test('should update a file', async () => {
    // First create a file
    await fs.writeFile(path.join(testDir, 'test.txt'), 'Initial content');

    const result = await fileEditor.applyEdit({
      filePath: 'test.txt',
      operation: 'update',
      content: 'Updated content'
    });

    expect(result.success).toBe(true);
    
    const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf8');
    expect(content).toBe('Updated content');
  });

  test('should replace content in file', async () => {
    await fs.writeFile(path.join(testDir, 'test.txt'), 'Hello World, this is a test');

    const result = await fileEditor.applyEdit({
      filePath: 'test.txt',
      operation: 'replace',
      oldContent: 'Hello World',
      newContent: 'Goodbye World'
    });

    expect(result.success).toBe(true);
    
    const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf8');
    expect(content).toBe('Goodbye World, this is a test');
  });

  test('should handle file not found for update', async () => {
    const result = await fileEditor.applyEdit({
      filePath: 'nonexistent.txt',
      operation: 'update',
      content: 'Some content'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('File does not exist');
  });
});
