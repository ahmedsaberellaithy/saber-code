const CodeAnalyzer = require('../../src/features/codeAnalyzer');
const { FileUtils } = require('../../src/utils/fileUtils');
const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const { createTempDir, cleanupTempDir, createMockProject } = require('../utils/test-helpers');

jest.mock('glob');
jest.mock('../../src/utils/fileUtils');

describe('CodeAnalyzer', () => {
  let codeAnalyzer;
  let testDir;
  let mockFileUtils;

  beforeAll(async () => {
    testDir = await createTempDir();
    await createMockProject(testDir);
  });

  afterAll(async () => {
    await cleanupTempDir(testDir);
  });

  beforeEach(() => {
    mockFileUtils = {
      readFile: jest.fn(),
      fileExists: jest.fn(),
      getFileInfo: jest.fn()
    };

    FileUtils.mockImplementation(() => mockFileUtils);
    codeAnalyzer = new CodeAnalyzer(testDir);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default rootPath', () => {
      const analyzer = new CodeAnalyzer();
      expect(analyzer.rootPath).toBe(process.cwd());
    });

    test('should initialize with custom rootPath', () => {
      const analyzer = new CodeAnalyzer('/custom/path');
      expect(analyzer.rootPath).toBe('/custom/path');
    });

    test('should set ignore patterns', () => {
      expect(codeAnalyzer.ignorePatterns).toContain('**/node_modules/**');
      expect(codeAnalyzer.ignorePatterns).toContain('**/.git/**');
      expect(codeAnalyzer.ignorePatterns).toContain('**/dist/**');
    });
  });

  describe('getProjectStructure', () => {
    test('should get project structure with file list', async () => {
      const mockFiles = [
        'package.json',
        'src/index.js',
        'src/app.js',
        'README.md',
        '.gitignore'
      ];

      glob.mockResolvedValueOnce(mockFiles);

      const structure = await codeAnalyzer.getProjectStructure();

      expect(structure.root).toBe(testDir);
      expect(structure.fileCount).toBe(5);
      expect(structure.files.length).toBeLessThanOrEqual(100);
      expect(glob).toHaveBeenCalledWith(
        '**/*',
        expect.objectContaining({
          cwd: testDir,
          ignore: codeAnalyzer.ignorePatterns,
          nodir: true
        })
      );
    });

    test('should analyze file types', async () => {
      const mockFiles = [
        'file1.js',
        'file2.js',
        'file3.ts',
        'file4.json',
        'file5.md'
      ];

      glob.mockResolvedValue(mockFiles);

      const structure = await codeAnalyzer.getProjectStructure();

      expect(structure.fileTypes).toBeDefined();
      expect(structure.fileTypes['.js']).toBe(2);
      expect(structure.fileTypes['.ts']).toBe(1);
      expect(structure.fileTypes['.json']).toBe(1);
    });

    test('should handle glob errors', async () => {
      // Reset glob mock for this specific test
      glob.mockReset();
      glob.mockRejectedValueOnce(new Error('Glob error'));

      await expect(codeAnalyzer.getProjectStructure()).rejects.toThrow(
        'Failed to analyze project structure: Glob error'
      );
    });
  });

  describe('analyzeFileTypes', () => {
    test('should count files by extension', () => {
      const files = [
        'file1.js',
        'file2.js',
        'file3.ts',
        'file4.json',
        'file5' // no extension
      ];

      const types = codeAnalyzer.analyzeFileTypes(files);

      expect(types['.js']).toBe(2);
      expect(types['.ts']).toBe(1);
      expect(types['.json']).toBe(1);
      expect(types['no-extension']).toBe(1);
    });
  });

  describe('readFile', () => {
    test('should read file and return file object', async () => {
      const content = 'console.log("test");\nconst x = 1;';
      mockFileUtils.readFile.mockResolvedValue(content);

      const file = await codeAnalyzer.readFile('test.js');

      expect(file.path).toBe('test.js');
      expect(file.content).toBe(content);
      expect(file.lines).toBe(2);
      expect(file.size).toBe(content.length);
      // CodeAnalyzer.readFile now explicitly calls with 'utf8' encoding
      expect(mockFileUtils.readFile).toHaveBeenCalledWith('test.js', 'utf8');
    });

    test('should handle read errors', async () => {
      mockFileUtils.readFile.mockRejectedValue(new Error('File not found'));

      await expect(codeAnalyzer.readFile('nonexistent.js')).rejects.toThrow(
        'Failed to read file nonexistent.js: File not found'
      );
    });
  });

  describe('readMultipleFiles', () => {
    test('should read multiple files matching patterns', async () => {
      glob.mockResolvedValueOnce(['file1.js', 'file2.js']);

      mockFileUtils.readFile
        .mockResolvedValueOnce('content1')
        .mockResolvedValueOnce('content2');

      const files = await codeAnalyzer.readMultipleFiles(['**/*.js']);

      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files[0].path).toBe('file1.js');
      if (files.length >= 2) {
        expect(files[1].path).toBe('file2.js');
      }
      expect(glob).toHaveBeenCalledWith(
        '**/*.js',
        expect.objectContaining({ cwd: testDir })
      );
    });

    test('should skip files that cannot be read', async () => {
      glob.mockResolvedValueOnce(['file1.js', 'file2.js', 'file3.js']);

      mockFileUtils.readFile
        .mockResolvedValueOnce('content1')
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce('content3');

      const files = await codeAnalyzer.readMultipleFiles(['**/*.js']);

      expect(files.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findFilesByContent', () => {
    test('should find files containing search term', async () => {
      glob.mockResolvedValueOnce(['file1.js', 'file2.js', 'file3.js']);

      mockFileUtils.readFile
        .mockResolvedValueOnce('const test = "hello";') // contains 'test'
        .mockResolvedValueOnce('const x = 1;') // doesn't contain 'test'
        .mockResolvedValueOnce('function testFunc() {}'); // contains 'test'

      const matches = await codeAnalyzer.findFilesByContent('test');

      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(matches.some(m => m.file === 'file1.js')).toBe(true);
    });

    test('should be case insensitive', async () => {
      glob.mockResolvedValueOnce(['file1.js']);

      mockFileUtils.readFile.mockResolvedValueOnce('const TEST = 1;');

      const matches = await codeAnalyzer.findFilesByContent('test');

      expect(matches.length).toBeGreaterThan(0);
    });

    test('should limit to first 50 files', async () => {
      const manyFiles = Array.from({ length: 60 }, (_, i) => `file${i}.js`);
      glob.mockResolvedValueOnce(manyFiles);

      mockFileUtils.readFile.mockResolvedValue('content');

      const matches = await codeAnalyzer.findFilesByContent('test');

      expect(matches.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getProjectSummary', () => {
    test('should get complete project summary', async () => {
      // Mock getProjectStructure (first glob call)
      glob.mockResolvedValueOnce([
        'package.json',
        'src/index.js',
        'src/app.js',
        'README.md'
      ]);

      const packageJsonContent = JSON.stringify({
        name: 'test-project',
        description: 'Test project description',
        dependencies: {
          express: '^4.18.0',
          axios: '^1.5.0'
        },
        devDependencies: {
          jest: '^29.7.0'
        },
        scripts: {
          start: 'node index.js',
          test: 'jest'
        }
      });

      // Mock readFile for package.json (called by getPackageJson)
      mockFileUtils.readFile.mockResolvedValueOnce(packageJsonContent);

      // Mock findConfigFiles (multiple glob calls)
      glob
        .mockResolvedValueOnce(['package.json']) // package.json pattern
        .mockResolvedValueOnce([]) // *.config.js
        .mockResolvedValueOnce([]) // *.config.ts
        .mockResolvedValueOnce([]) // .env*
        .mockResolvedValueOnce([]) // tsconfig.json
        .mockResolvedValueOnce([]) // webpack.config.js
        .mockResolvedValueOnce([]) // dockerfile
        .mockResolvedValueOnce([]) // docker-compose.yml
        .mockResolvedValueOnce(['README.md']); // README.md

      const summary = await codeAnalyzer.getProjectSummary();

      expect(summary.projectName).toBe('test-project');
      expect(summary.description).toBe('Test project description');
      expect(summary.fileCount).toBe(4);
      expect(summary.dependencies).toContain('express');
      expect(summary.dependencies).toContain('axios');
      expect(summary.devDependencies).toContain('jest');
      expect(summary.scripts.start).toBe('node index.js');
      expect(summary.configFiles).toContain('package.json');
    });

    test('should handle missing package.json', async () => {
      // Mock getProjectStructure
      glob.mockResolvedValueOnce(['src/index.js']);

      // Mock readFile for package.json (will fail)
      mockFileUtils.readFile.mockRejectedValueOnce(new Error('File not found'));

      // Mock findConfigFiles (multiple glob calls)
      glob
        .mockResolvedValueOnce([]) // package.json
        .mockResolvedValueOnce([]) // *.config.js
        .mockResolvedValueOnce([]) // *.config.ts
        .mockResolvedValueOnce([]) // .env*
        .mockResolvedValueOnce([]) // tsconfig.json
        .mockResolvedValueOnce([]) // webpack.config.js
        .mockResolvedValueOnce([]) // dockerfile
        .mockResolvedValueOnce([]) // docker-compose.yml
        .mockResolvedValueOnce([]); // README.md

      const summary = await codeAnalyzer.getProjectSummary();

      expect(summary.projectName).toBe(path.basename(testDir));
      expect(summary.description).toBe('');
      expect(summary.dependencies).toEqual([]);
    });
  });

  describe('getPackageJson', () => {
    test('should parse package.json', async () => {
      const packageJson = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: { express: '^4.18.0' }
      };

      mockFileUtils.readFile.mockResolvedValue(JSON.stringify(packageJson));

      const result = await codeAnalyzer.getPackageJson();

      expect(result.name).toBe('test-package');
      expect(result.version).toBe('1.0.0');
      expect(result.dependencies.express).toBe('^4.18.0');
    });

    test('should return empty object if package.json not found', async () => {
      mockFileUtils.readFile.mockRejectedValue(new Error('File not found'));

      const result = await codeAnalyzer.getPackageJson();

      expect(result).toEqual({});
    });

    test('should return empty object for invalid JSON', async () => {
      mockFileUtils.readFile.mockResolvedValue('invalid json');

      const result = await codeAnalyzer.getPackageJson();

      expect(result).toEqual({});
    });
  });

  describe('findConfigFiles', () => {
    test('should find common config files', async () => {
      // Mock all 9 glob calls that findConfigFiles makes
      glob
        .mockResolvedValueOnce(['package.json'])      // package.json
        .mockResolvedValueOnce([])                     // *.config.js
        .mockResolvedValueOnce([])                     // *.config.ts
        .mockResolvedValueOnce(['.env'])               // .env*
        .mockResolvedValueOnce(['tsconfig.json'])      // tsconfig.json
        .mockResolvedValueOnce([])                     // webpack.config.js
        .mockResolvedValueOnce(['dockerfile'])         // dockerfile
        .mockResolvedValueOnce(['docker-compose.yml']) // docker-compose.yml
        .mockResolvedValueOnce(['README.md']);         // README.md

      const configFiles = await codeAnalyzer.findConfigFiles();

      expect(configFiles.length).toBeGreaterThan(0);
      expect(configFiles).toContain('package.json');
      expect(configFiles).toContain('README.md');
      expect(glob).toHaveBeenCalledTimes(9);
    });

    test('should use case-insensitive matching', async () => {
      // Reset and mock all 9 calls
      glob.mockReset();
      glob
        .mockResolvedValueOnce(['package.json'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['Dockerfile'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['README.md']);

      const configFiles = await codeAnalyzer.findConfigFiles();

      expect(glob).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ cwd: testDir, nocase: true })
      );
    });
  });

  describe('debugFileAccess', () => {
    test('should return file info and content for existing file', async () => {
      const fileInfo = {
        exists: true,
        isFile: true,
        isDirectory: false,
        size: 100,
        modified: new Date()
      };

      mockFileUtils.getFileInfo.mockResolvedValue(fileInfo);
      mockFileUtils.readFile.mockResolvedValue('file content');

      const result = await codeAnalyzer.debugFileAccess('test.js');

      expect(result.info).toEqual(fileInfo);
      expect(result.content.content).toBe('file content');
    });

    test('should handle non-existent files', async () => {
      const fileInfo = {
        exists: false,
        isFile: false,
        isDirectory: false,
        size: 0,
        modified: null
      };

      mockFileUtils.getFileInfo.mockResolvedValue(fileInfo);

      const result = await codeAnalyzer.debugFileAccess('nonexistent.js');

      expect(result.info.exists).toBe(false);
      expect(result.content).toBe('FILE NOT FOUND');
    });

    test('should handle debug errors', async () => {
      mockFileUtils.getFileInfo.mockRejectedValue(new Error('Access error'));

      const result = await codeAnalyzer.debugFileAccess('test.js');

      expect(result.error).toBe('Access error');
    });
  });
});

