const fs = require('fs').promises;
const path = require('path');

class FileEditor {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
  }

  async applyEdit(editRequest) {
    const { filePath, operation, content, line, oldContent, newContent } = editRequest;

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.rootPath, filePath);

    try {
      switch (operation) {
        case 'create':
          return await this.createFile(fullPath, content);
        
        case 'update':
          return await this.updateFile(fullPath, content);
        
        case 'replace':
          return await this.replaceInFile(fullPath, oldContent, newContent);
        
        case 'insert':
          return await this.insertAtLine(fullPath, line, content);
        
        case 'delete':
          return await this.deleteFile(fullPath);
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`Failed to apply edit to ${filePath}: ${error.message}`);
    }
  }

  async createFile(filePath, content) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return { success: true, message: `Created file: ${filePath}` };
  }

  async updateFile(filePath, newContent) {
    const exists = await this.fileExists(filePath);
    if (!exists) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    await fs.writeFile(filePath, newContent);
    return { success: true, message: `Updated file: ${filePath}` };
  }

  async replaceInFile(filePath, oldContent, newContent) {
    const currentContent = await fs.readFile(filePath, 'utf8');
    
    if (!currentContent.includes(oldContent)) {
      throw new Error(`Content to replace not found in file: ${filePath}`);
    }

    const updatedContent = currentContent.replace(oldContent, newContent);
    await fs.writeFile(filePath, updatedContent);
    
    return { 
      success: true, 
      message: `Replaced content in: ${filePath}`,
      replacements: currentContent.split(oldContent).length - 1
    };
  }

  async insertAtLine(filePath, lineNumber, contentToInsert) {
    const currentContent = await fs.readFile(filePath, 'utf8');
    const lines = currentContent.split('\n');
    
    if (lineNumber < 1 || lineNumber > lines.length + 1) {
      throw new Error(`Line number ${lineNumber} is out of range`);
    }

    lines.splice(lineNumber - 1, 0, contentToInsert);
    await fs.writeFile(filePath, lines.join('\n'));
    
    return { success: true, message: `Inserted content at line ${lineNumber} in: ${filePath}` };
  }

  async deleteFile(filePath) {
    await fs.unlink(filePath);
    return { success: true, message: `Deleted file: ${filePath}` };
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async backupFile(filePath) {
    const backupPath = `${filePath}.backup-${Date.now()}`;
    const content = await fs.readFile(filePath, 'utf8');
    await fs.writeFile(backupPath, content);
    return backupPath;
  }
}

module.exports = FileEditor;