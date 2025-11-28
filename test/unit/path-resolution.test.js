const { FileUtils } = require('../../src/utils/fileUtils');
const path = require('path');

describe('FileUtils Path Resolution', () => {
  let fileUtils;

  beforeEach(() => {
    fileUtils = new FileUtils(process.cwd());
  });

  test('should resolve relative paths correctly', () => {
    const relativePath = 'cli.js';
    const resolved = fileUtils.resolvePath(relativePath);
    expect(resolved).toBe(path.join(process.cwd(), 'cli.js'));
  });

  test('should keep absolute paths unchanged', () => {
    const absolutePath = '/absolute/path/test.js';
    const resolved = fileUtils.resolvePath(absolutePath);
    expect(resolved).toBe(absolutePath);
  });

  test('should resolve nested relative paths', () => {
    const relativePath = 'src/core/ollamaInterface.js';
    const resolved = fileUtils.resolvePath(relativePath);
    expect(resolved).toBe(path.join(process.cwd(), 'src/core/ollamaInterface.js'));
  });

  test('should resolve paths with ./ prefix', () => {
    const relativePath = './cli.js';
    const resolved = fileUtils.resolvePath(relativePath);
    expect(resolved).toBe(path.join(process.cwd(), 'cli.js'));
  });
});
