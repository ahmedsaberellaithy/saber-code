const CodeAnalyzer = require('./codeAnalyzer');

class ProjectContext {
  constructor(rootPath = process.cwd()) {
    this.analyzer = new CodeAnalyzer(rootPath);
    this.context = {
      currentFiles: [],
      projectSummary: null,
      recentChanges: [],
      conversationHistory: []
    };
  }

  async initialize() {
    this.context.projectSummary = await this.analyzer.getProjectSummary();
    return this.context;
  }

  async addFileToContext(filePath) {
    try {
      const fileContent = await this.analyzer.readFile(filePath);
      this.context.currentFiles.push(fileContent);
      return fileContent;
    } catch (error) {
      throw new Error(`Failed to add file to context: ${error.message}`);
    }
  }

  async addMultipleFiles(filePatterns) {
    const files = await this.analyzer.readMultipleFiles(filePatterns);
    this.context.currentFiles.push(...files);
    return files;
  }

  async searchAndAddFiles(searchTerm) {
    const matches = await this.analyzer.findFilesByContent(searchTerm);
    for (const match of matches.slice(0, 5)) { // Limit to 5 files
      await this.addFileToContext(match.file);
    }
    return matches;
  }

  getSystemPrompt() {
    const summary = this.context.projectSummary;
    const currentFiles = this.context.currentFiles;
    
    let prompt = `You are an expert AI coding assistant. You have deep knowledge of software development and can help with code analysis, editing, and project management.

Current Project Context:
- Project: ${summary?.projectName || 'Unknown'}
- Files: ${summary?.fileCount || 0} total files
- Type: ${Object.keys(summary?.fileTypes || {}).join(', ') || 'Unknown'}

`;

    if (currentFiles.length > 0) {
      prompt += "\nCurrently loaded files:\n";
      currentFiles.forEach(file => {
        prompt += `- ${file.path} (${file.lines} lines)\n`;
      });
    }

    prompt += `
You can:
1. Analyze code and suggest improvements
2. Edit files (create, update, replace content)
3. Provide project summaries
4. Search for code patterns
5. Explain code functionality

When suggesting edits, be specific about:
- Which file to modify
- What operation to perform (create, update, replace, insert, delete)
- Exact content changes

Always consider the project structure and dependencies when making recommendations.`;

    return prompt;
  }

  addToHistory(role, content) {
    this.context.conversationHistory.push({ role, content, timestamp: new Date() });
    
    // Keep only last 20 messages to manage context size
    if (this.context.conversationHistory.length > 20) {
      this.context.conversationHistory = this.context.conversationHistory.slice(-20);
    }
  }

  getConversationHistory() {
    return this.context.conversationHistory;
  }

  clearContext() {
    this.context.currentFiles = [];
    this.context.recentChanges = [];
  }
}

module.exports = ProjectContext;