const { FileUtils } = require('../../src/utils/fileUtils');
const fs = require('fs').promises;
const path = require('path');
const { createTempDir, cleanupTempDir } = require('../utils/test-helpers');

describe('FileUtils Extended Operations', () => {
  let fileUtils;
  let testDir;

  beforeAll(async () => {
    testDir = await createTempDir();
    fileUtils = new FileUtils(testDir);
  });

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  beforeEach(async () => {
    // Clean test directory
    try {
      const files = await fs.readdir(testDir);
      for (const file of files) {
        const filePath = path.join(testDir, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          await fs.rm(filePath, { recursive: true, force: true });
        } else {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      // Ignore if empty
    }
  });

  describe('readFile', () => {
    test('should read file with default encoding', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Test content';
      await fs.writeFile(filePath, content);

      const result = await fileUtils.readFile('test.txt');

      expect(result).toBe(content);
    });

    test('should read file with custom encoding', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Test content';
      await fs.writeFile(filePath, content);

      const result = await fileUtils.readFile('test.txt', 'utf8');

      expect(result).toBe(content);
    });

    test('should handle read errors', async () => {
      await expect(fileUtils.readFile('nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    test('should write file with content', async () => {
      const content = 'Test content to write';

      await fileUtils.writeFile('test.txt', content);

      const writtenContent = await fs.readFile(path.join(testDir, 'test.txt'), 'utf8');
      expect(writtenContent).toBe(content);
    });

    test('should create directory structure if needed', async () => {
      const content = 'Nested file content';

      await fileUtils.writeFile('nested/deep/file.txt', content);

      const filePath = path.join(testDir, 'nested', 'deep', 'file.txt');
      const writtenContent = await fs.readFile(filePath, 'utf8');
      expect(writtenContent).toBe(content);
    });

    test('should overwrite existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'Old content');

      await fileUtils.writeFile('test.txt', 'New content');

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('New content');
    });
  });

  describe('unlink', () => {
    test('should delete file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'Content');

      await fileUtils.unlink('test.txt');

      await expect(fs.access(filePath)).rejects.toThrow();
    });

    test('should handle unlink errors for non-existent file', async () => {
      await expect(fileUtils.unlink('nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('access', () => {
    test('should access existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'Content');

      await expect(fileUtils.access('test.txt')).resolves.not.toThrow();
    });

    test('should throw for non-existent file', async () => {
      await expect(fileUtils.access('nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('mkdir', () => {
    test('should create directory', async () => {
      const dirPath = path.join(testDir, 'newdir');

      await fileUtils.mkdir('newdir');

      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    test('should create nested directories with recursive option', async () => {
      await fileUtils.mkdir('nested/deep/directory', { recursive: true });

      const dirPath = path.join(testDir, 'nested', 'deep', 'directory');
      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe('ensureDir', () => {
    test('should create directory if it does not exist', async () => {
      await fileUtils.ensureDir('ensuredir');

      const dirPath = path.join(testDir, 'ensuredir');
      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    test('should not fail if directory already exists', async () => {
      const dirPath = path.join(testDir, 'existingdir');
      await fs.mkdir(dirPath, { recursive: true });

      await expect(fileUtils.ensureDir('existingdir')).resolves.not.toThrow();

      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    test('should create nested directory structure', async () => {
      await fileUtils.ensureDir('nested/path/to/dir');

      const dirPath = path.join(testDir, 'nested', 'path', 'to', 'dir');
      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe('fileExists', () => {
    test('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'Content');

      const exists = await fileUtils.fileExists('test.txt');

      expect(exists).toBe(true);
    });

    test('should return false for non-existent file', async () => {
      const exists = await fileUtils.fileExists('nonexistent.txt');

      expect(exists).toBe(false);
    });

    test('should return true for existing directory', async () => {
      const dirPath = path.join(testDir, 'testdir');
      await fs.mkdir(dirPath, { recursive: true });

      const exists = await fileUtils.fileExists('testdir');

      expect(exists).toBe(true);
    });
  });

  describe('readdir', () => {
    test('should list directory contents', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'Content 1');
      await fs.writeFile(path.join(testDir, 'file2.txt'), 'Content 2');
      await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });

      const entries = await fileUtils.readdir('.');

      expect(entries.length).toBeGreaterThanOrEqual(3);
      expect(entries).toContain('file1.txt');
      expect(entries).toContain('file2.txt');
      expect(entries).toContain('subdir');
    });

    test('should list directory with options', async () => {
      await fs.writeFile(path.join(testDir, 'file.txt'), 'Content');
      await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });

      const entries = await fileUtils.readdir('.', { withFileTypes: true });

      expect(Array.isArray(entries)).toBe(true);
    });

    test('should handle readdir errors for non-existent directory', async () => {
      await expect(fileUtils.readdir('nonexistent')).rejects.toThrow();
    });
  });

  describe('getFileInfo', () => {
    test('should return info for existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Test content';
      await fs.writeFile(filePath, content);

      const info = await fileUtils.getFileInfo('test.txt');

      expect(info.exists).toBe(true);
      expect(info.isFile).toBe(true);
      expect(info.isDirectory).toBe(false);
      expect(info.size).toBe(content.length);
      // stats.mtime is a Date object from fs.stat
      expect(info.modified).toBeDefined();
      expect(info.modified).not.toBeNull();
      // Check if it's a Date-like object (can be converted to Date)
      expect(new Date(info.modified).toString()).not.toBe('Invalid Date');
    });

    test('should return info for existing directory', async () => {
      const dirPath = path.join(testDir, 'testdir');
      await fs.mkdir(dirPath, { recursive: true });

      const info = await fileUtils.getFileInfo('testdir');

      expect(info.exists).toBe(true);
      expect(info.isFile).toBe(false);
      expect(info.isDirectory).toBe(true);
    });

    test('should return default info for non-existent file', async () => {
      const info = await fileUtils.getFileInfo('nonexistent.txt');

      expect(info.exists).toBe(false);
      expect(info.isFile).toBe(false);
      expect(info.isDirectory).toBe(false);
      expect(info.size).toBe(0);
      expect(info.modified).toBeNull();
    });
  });

  describe('resolvePath', () => {
    test('should resolve relative paths', () => {
      const relativePath = 'test/file.txt';
      const resolved = fileUtils.resolvePath(relativePath);

      expect(resolved).toBe(path.join(testDir, 'test/file.txt'));
    });

    test('should keep absolute paths unchanged', () => {
      const absolutePath = '/absolute/path/file.txt';
      const resolved = fileUtils.resolvePath(absolutePath);

      expect(resolved).toBe(absolutePath);
    });

    test('should resolve paths with ./ prefix', () => {
      const relativePath = './test.txt';
      const resolved = fileUtils.resolvePath(relativePath);

      expect(resolved).toBe(path.join(testDir, 'test.txt'));
    });

    test('should resolve paths with ../ prefix', () => {
      const relativePath = '../test.txt';
      const resolved = fileUtils.resolvePath(relativePath);

      expect(resolved).toBe(path.join(path.dirname(testDir), 'test.txt'));
    });
  });
});

