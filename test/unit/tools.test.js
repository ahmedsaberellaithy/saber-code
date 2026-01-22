const { createRegistry } = require('../../src/tools');
const { FileUtils } = require('../../src/utils/fileUtils');
const fs = require('fs').promises;
const path = require('path');

describe('Tools', () => {
  let registry;
  let testDir;
  let ctx;

  beforeAll(async () => {
    testDir = path.join(__dirname, 'test-temp-tools');
    await fs.mkdir(testDir, { recursive: true });
    registry = createRegistry();
    const fileUtils = new FileUtils(testDir);
    ctx = { rootPath: testDir, fileUtils, config: { limits: {} } };
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const files = await fs.readdir(testDir).catch(() => []);
    for (const f of files) {
      await fs.unlink(path.join(testDir, f)).catch(() => {});
    }
  });

  describe('read tool', () => {
    test('should read a single file', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'Hello World');
      const result = await registry.run('read', ctx, { path: 'test.txt' });
      expect(result.path).toBe('test.txt');
      expect(result.content).toBe('Hello World');
    });

    test('should read multiple files', async () => {
      await fs.writeFile(path.join(testDir, 'a.txt'), 'A');
      await fs.writeFile(path.join(testDir, 'b.txt'), 'B');
      const result = await registry.run('read', ctx, { paths: ['a.txt', 'b.txt'] });
      expect(result.files).toHaveLength(2);
    });
  });

  describe('write tool', () => {
    test('should create a new file', async () => {
      const result = await registry.run('write', ctx, {
        path: 'new.txt',
        content: 'New content'
      });
      expect(result.written).toBe(true);
      const content = await fs.readFile(path.join(testDir, 'new.txt'), 'utf8');
      expect(content).toBe('New content');
    });
  });

  describe('edit tool', () => {
    test('should replace text', async () => {
      await fs.writeFile(path.join(testDir, 'edit.txt'), 'Old text here');
      const result = await registry.run('edit', ctx, {
        path: 'edit.txt',
        operation: 'replace',
        oldText: 'Old text',
        newText: 'New text'
      });
      expect(result.done).toBe(true);
      const content = await fs.readFile(path.join(testDir, 'edit.txt'), 'utf8');
      expect(content).toBe('New text here');
    });

    test('should insert at line', async () => {
      await fs.writeFile(path.join(testDir, 'insert.txt'), 'Line 1\nLine 2\nLine 3');
      const result = await registry.run('edit', ctx, {
        path: 'insert.txt',
        operation: 'insert',
        line: 2,
        newText: 'Inserted line'
      });
      expect(result.done).toBe(true);
      const content = await fs.readFile(path.join(testDir, 'insert.txt'), 'utf8');
      const lines = content.split('\n');
      expect(lines[1]).toBe('Inserted line');
    });
  });

  describe('list tool', () => {
    test('should list directory contents', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), '');
      await fs.writeFile(path.join(testDir, 'file2.txt'), '');
      const result = await registry.run('list', ctx, { path: '.' });
      expect(result.entries.length).toBeGreaterThanOrEqual(2);
      const names = result.entries.map(e => e.name);
      expect(names).toContain('file1.txt');
      expect(names).toContain('file2.txt');
    });
  });

  describe('search tool', () => {
    test('should search for pattern in files', async () => {
      await fs.writeFile(path.join(testDir, 'search.txt'), 'Hello World\nTest pattern\nAnother line');
      const result = await registry.run('search', ctx, {
        pattern: 'pattern',
        glob: '*.txt'
      });
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].line).toContain('pattern');
    });
  });

  describe('shell tool', () => {
    test('should run shell command', async () => {
      const result = await registry.run('shell', ctx, {
        command: 'echo "test"'
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('test');
    });
  });
});
