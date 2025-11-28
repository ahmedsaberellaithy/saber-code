const fs = require("fs").promises;
const path = require("path");

class FileUtils {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
  }

  // Resolve path to absolute path relative to project root
  resolvePath(filePath) {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.rootPath, filePath);
  }

  async readFile(filePath, encoding = "utf8") {
    const resolvedPath = this.resolvePath(filePath);
    return await fs.readFile(resolvedPath, encoding);
  }

  async writeFile(filePath, content, encoding = "utf8") {
    const resolvedPath = this.resolvePath(filePath);

    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    await this.ensureDir(dir);

    return await fs.writeFile(resolvedPath, content, encoding);
  }

  async unlink(filePath) {
    const resolvedPath = this.resolvePath(filePath);
    return await fs.unlink(resolvedPath);
  }

  async access(filePath) {
    const resolvedPath = this.resolvePath(filePath);
    return await fs.access(resolvedPath);
  }

  async mkdir(dirPath, options = { recursive: true }) {
    const resolvedPath = this.resolvePath(dirPath);
    return await fs.mkdir(resolvedPath, options);
  }

  async ensureDir(dirPath) {
    const resolvedPath = this.resolvePath(dirPath);
    try {
      await this.mkdir(resolvedPath, { recursive: true });
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }

  async fileExists(filePath) {
    try {
      await this.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readdir(dirPath, options = {}) {
    const resolvedPath = this.resolvePath(dirPath);
    return await fs.readdir(resolvedPath, options);
  }

  // Get file info
  async getFileInfo(filePath) {
    const resolvedPath = this.resolvePath(filePath);
    try {
      const stats = await fs.stat(resolvedPath);
      return {
        exists: true,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      return {
        exists: false,
        isFile: false,
        isDirectory: false,
        size: 0,
        modified: null,
      };
    }
  }
}

// Create default instance for backward compatibility
const defaultFileUtils = new FileUtils();

// Export both the class and default instance
module.exports = {
  FileUtils,
  // Backward compatible exports
  readFile: (filePath, encoding) =>
    defaultFileUtils.readFile(filePath, encoding),
  writeFile: (filePath, content, encoding) =>
    defaultFileUtils.writeFile(filePath, content, encoding),
  unlink: (filePath) => defaultFileUtils.unlink(filePath),
  access: (filePath) => defaultFileUtils.access(filePath),
  mkdir: (dirPath, options) => defaultFileUtils.mkdir(dirPath, options),
  ensureDir: (dirPath) => defaultFileUtils.ensureDir(dirPath),
  fileExists: (filePath) => defaultFileUtils.fileExists(filePath),
  readdir: (dirPath, options) => defaultFileUtils.readdir(dirPath, options),
};
