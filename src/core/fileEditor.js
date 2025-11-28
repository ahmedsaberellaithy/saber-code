const { writeFile, readFile, unlink, access, mkdir } = require('../utils/fileUtils');
const path = require('path');

class FileEditor {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
  }

  async applyEdit(editRequest) {
    const { filePath, operation, content, line, oldContent, newContent } = editRequest;

    if (!filePath) throw new Error('filePath is required');
    if (!operation) throw new Error('operation is required');

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.rootPath, filePath);

    try {
      let result;

      switch (operation) {
        case 'create':
          if (!content) throw new Error('content is required for create operation');
          result = await this.createFile(fullPath, content);
          break;
        
        case 'update':
          if (!content) throw new Error('content is required for update operation');
          result = await this.updateFile(fullPath, content);
          break;
        
        case 'replace':
          if (!oldContent || !newContent) throw new Error('oldContent and newContent are required for replace operation');
          result = await this.replaceInFile(fullPath, oldContent, newContent);
          break;
        
        case 'insert':
          if (line === undefined || !content) throw new Error('line and content are required for insert operation');
          result = await this.insertAtLine(fullPath, line, content);
          break;
        
        case 'delete':
          result = await this.deleteFile(fullPath);
          break;
        
        default:
          throw new Error(`Unknown operation: ${operation}. Supported: create, update, replace, insert, delete`);
      }

      return {
        success: true,
        message: result.message || `Operation ${operation} completed on ${filePath}`,
        filePath: filePath,
        operation: operation
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath: filePath,
        operation: operation
      };
    }
  }

  async createFile(filePath, content) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
    return { message: `Created file: ${filePath}` };
  }

  async updateFile(filePath, newContent) {
    const exists = await this.fileExists(filePath);
    if (!exists) throw new Error(`File does not exist: ${filePath}`);
    await writeFile(filePath, newContent);
    return { message: `Updated file: ${filePath}` };
  }

  async replaceInFile(filePath, oldContent, newContent) {
    const currentContent = await readFile(filePath);
    if (!currentContent.includes(oldContent)) {
      throw new Error(`Content to replace not found in file: ${filePath}`);
    }
    const updatedContent = currentContent.replace(oldContent, newContent);
    await writeFile(filePath, updatedContent);
    return { 
      message: `Replaced content in: ${filePath}`,
      replacements: currentContent.split(oldContent).length - 1
    };
  }

  async insertAtLine(filePath, lineNumber, contentToInsert) {
    const currentContent = await readFile(filePath);
    const lines = currentContent.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length + 1) {
      throw new Error(`Line number ${lineNumber} is out of range`);
    }
    lines.splice(lineNumber - 1, 0, contentToInsert);
    await writeFile(filePath, lines.join('\n'));
    return { message: `Inserted content at line ${lineNumber} in: ${filePath}` };
  }

  async deleteFile(filePath) {
    await unlink(filePath);
    return { message: `Deleted file: ${filePath}` };
  }

  async fileExists(filePath) {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async backupFile(filePath) {
    const backupPath = `${filePath}.backup-${Date.now()}`;
    const content = await readFile(filePath);
    await writeFile(backupPath, content);
    return backupPath;
  }
}

module.exports = FileEditor;
