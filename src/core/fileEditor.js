const { FileUtils } = require("../utils/fileUtils");
const path = require("path");

class FileEditor {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
    this.fileUtils = new FileUtils(rootPath);
  }

  async applyEdit(editRequest) {
    const { filePath, operation, content, line, oldContent, newContent } =
      editRequest;

    if (!filePath) throw new Error("filePath is required");
    if (!operation) throw new Error("operation is required");

    console.log(`📝 Applying ${operation} operation on: ${filePath}`);

    try {
      let result;

      switch (operation) {
        case "create":
          if (!content)
            throw new Error("content is required for create operation");
          result = await this.createFile(filePath, content);
          break;

        case "update":
          if (!content)
            throw new Error("content is required for update operation");
          result = await this.updateFile(filePath, content);
          break;

        case "append":
          if (!content)
            throw new Error("content is required for append operation");
          result = await this.appendToFile(filePath, content);
          break;

        case "replace":
          if (!oldContent || !newContent)
            throw new Error(
              "oldContent and newContent are required for replace operation"
            );
          result = await this.replaceInFile(filePath, oldContent, newContent);
          break;

        case "insert":
          if (line === undefined || !content)
            throw new Error(
              "line and content are required for insert operation"
            );
          result = await this.insertAtLine(filePath, line, content);
          break;

        case "delete":
          result = await this.deleteFile(filePath);
          break;

        default:
          throw new Error(
            `Unknown operation: ${operation}. Supported: create, update, append, replace, insert, delete`
          );
      }

      return {
        success: true,
        message:
          result.message || `Operation ${operation} completed on ${filePath}`,
        filePath: filePath,
        operation: operation,
        content: result.content || content,
        // Include additional properties from result (previousContent, newContent, replacements, etc.)
        ...(result.previousContent && { previousContent: result.previousContent }),
        ...(result.newContent && { newContent: result.newContent }),
        ...(result.replacements !== undefined && { replacements: result.replacements }),
      };
    } catch (error) {
      console.error(
        `❌ Error in ${operation} operation on ${filePath}:`,
        error.message
      );
      return {
        success: false,
        error: error.message,
        filePath: filePath,
        operation: operation,
      };
    }
  }

  async createFile(filePath, content) {
    await this.fileUtils.writeFile(filePath, content);
    return { 
      message: `Created file: ${filePath}`,
      content: content 
    };
  }

  async updateFile(filePath, newContent) {
    const exists = await this.fileExists(filePath);
    if (!exists) throw new Error(`File does not exist: ${filePath}`);
    
    // Read existing content first (for context updates)
    const existingContent = await this.readFile(filePath);
    
    // Write new content (replaces entire file)
    await this.fileUtils.writeFile(filePath, newContent);
    
    return { 
      message: `Updated file: ${filePath}`,
      previousContent: existingContent,
      newContent: newContent,
      content: newContent
    };
  }

  async appendToFile(filePath, contentToAppend) {
    const exists = await this.fileExists(filePath);
    if (!exists) throw new Error(`File does not exist: ${filePath}`);
    
    const existingContent = await this.readFile(filePath);
    const newContent = existingContent + "\n" + contentToAppend;
    
    await this.fileUtils.writeFile(filePath, newContent);
    
    return { 
      message: `Appended content to: ${filePath}`,
      previousContent: existingContent,
      appendedContent: contentToAppend,
      newContent: newContent,
      content: newContent
    };
  }

  async replaceInFile(filePath, oldContent, newContent) {
    const currentContent = await this.fileUtils.readFile(filePath);
    if (!currentContent.includes(oldContent)) {
      throw new Error(`Content to replace not found in file: ${filePath}`);
    }
    
    const updatedContent = currentContent.replace(oldContent, newContent);
    await this.fileUtils.writeFile(filePath, updatedContent);
    
    // Count how many occurrences were actually replaced (replace() only replaces first)
    const totalOccurrences = currentContent.split(oldContent).length - 1;
    const actualReplacements = totalOccurrences > 0 ? 1 : 0; // replace() only replaces first occurrence
    
    return {
      message: `Replaced content in: ${filePath}`,
      previousContent: currentContent,
      replacedContent: oldContent,
      replacementContent: newContent,
      newContent: updatedContent,
      replacements: actualReplacements,
      content: updatedContent
    };
  }

  async insertAtLine(filePath, lineNumber, contentToInsert) {
    const currentContent = await this.fileUtils.readFile(filePath);
    const lines = currentContent.split("\n");
    
    if (lineNumber < 1 || lineNumber > lines.length + 1) {
      throw new Error(`Line number ${lineNumber} is out of range`);
    }
    
    lines.splice(lineNumber - 1, 0, contentToInsert);
    const newContent = lines.join("\n");
    await this.fileUtils.writeFile(filePath, newContent);
    
    return {
      message: `Inserted content at line ${lineNumber} in: ${filePath}`,
      previousContent: currentContent,
      insertedContent: contentToInsert,
      newContent: newContent,
      content: newContent
    };
  }

  async deleteFile(filePath) {
    const exists = await this.fileExists(filePath);
    if (!exists) throw new Error(`File does not exist: ${filePath}`);
    
    const previousContent = await this.readFile(filePath);
    await this.fileUtils.unlink(filePath);
    
    return { 
      message: `Deleted file: ${filePath}`,
      previousContent: previousContent
    };
  }

  async fileExists(filePath) {
    return await this.fileUtils.fileExists(filePath);
  }

  async readFile(filePath) {
    return await this.fileUtils.readFile(filePath);
  }

  async backupFile(filePath) {
    const backupPath = `${filePath}.backup-${Date.now()}`;
    const content = await this.readFile(filePath);
    await this.fileUtils.writeFile(backupPath, content);
    return backupPath;
  }

  // Get file info for debugging
  async getFileInfo(filePath) {
    return await this.fileUtils.getFileInfo(filePath);
  }

  // Helper to modify specific parts of a file
  async modifyFile(filePath, modifications) {
    const currentContent = await this.readFile(filePath);
    let newContent = currentContent;
    
    for (const mod of modifications) {
      if (mod.type === 'replace' && mod.oldContent && mod.newContent) {
        newContent = newContent.replace(mod.oldContent, mod.newContent);
      } else if (mod.type === 'insert' && mod.line !== undefined && mod.content) {
        const lines = newContent.split("\n");
        lines.splice(mod.line - 1, 0, mod.content);
        newContent = lines.join("\n");
      }
    }
    
    if (newContent !== currentContent) {
      await this.fileUtils.writeFile(filePath, newContent);
      return {
        success: true,
        message: `Modified file: ${filePath}`,
        previousContent: currentContent,
        newContent: newContent,
        content: newContent
      };
    }
    
    return {
      success: true,
      message: `No changes made to: ${filePath}`,
      content: currentContent
    };
  }
}

module.exports = FileEditor;