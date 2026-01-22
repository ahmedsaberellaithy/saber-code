const CodeAnalyzer = require("../features/codeAnalyzer");
const {
  ensureDir,
  readFile,
  writeFile,
  fileExists,
} = require("../utils/fileUtils");
const path = require("path");

class ProjectContext {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
    this.analyzer = new CodeAnalyzer(rootPath);
    this.historyDir = path.join(rootPath, ".saber-chat-history");
    this.knowledgeFile = path.join(this.historyDir, "intro_to_project.md");
    this.historyFile = path.join(this.historyDir, "chat_history.json");
    this.context = {
      currentFiles: [],
      projectSummary: null,
      recentChanges: [],
      conversationHistory: [],
    };
  }

  async initialize() {
    console.log("📁 Analyzing project structure...");
    await this.ensureHistoryDir();
    await this.loadHistory();

    try {
      this.context.projectSummary = await this.analyzer.getProjectSummary();
      console.log(`✅ Found ${this.context.projectSummary.fileCount} files`);
    } catch (error) {
      console.warn("⚠️  Limited project analysis:", error.message);
      this.context.projectSummary = {
        projectName: path.basename(this.rootPath),
        fileCount: 0,
        fileTypes: {},
        description: "Project analysis limited",
      };
    }

    const knowledge = await this.loadKnowledge();
    if (knowledge) {
      console.log("📚 Loaded existing project knowledge");
    }

    return this.context;
  }

  async ensureHistoryDir() {
    await ensureDir(this.historyDir);
  }

  async loadHistory() {
    try {
      const historyData = await readFile(this.historyFile);
      this.context.conversationHistory = JSON.parse(historyData);
      this.hasKnowledge = await fileExists(this.knowledgeFile);
    } catch (error) {
      this.context.conversationHistory = [];
      this.hasKnowledge = false;
    }
  }

  async saveHistory() {
    try {
      await this.ensureHistoryDir();
      await writeFile(
        this.historyFile,
        JSON.stringify(this.context.conversationHistory, null, 2)
      );
    } catch (error) {
      console.warn("Could not save chat history:", error.message);
    }
  }

  async saveKnowledge(knowledgeContent) {
    try {
      await this.ensureHistoryDir();
      await writeFile(this.knowledgeFile, knowledgeContent);
      this.hasKnowledge = true;
    } catch (error) {
      console.warn("Could not save knowledge file:", error.message);
    }
  }

  async loadKnowledge() {
    try {
      return await readFile(this.knowledgeFile);
    } catch (error) {
      return null;
    }
  }

  async generateKnowledgeSummary() {
    const summary = this.context.projectSummary;
    const recentDiscussions = this.context.conversationHistory
      .slice(-10)
      .map((msg) => `- ${msg.role}: ${msg.content.substring(0, 200)}...`)
      .join("\n");

    return `# Project Knowledge Base
Generated: ${new Date().toISOString()}

## Project Overview
- **Name**: ${summary?.projectName || "Unknown"}
- **Description**: ${summary?.description || "No description"}
- **File Types**: ${Object.keys(summary?.fileTypes || {}).join(", ")}
- **Total Files**: ${summary?.fileCount || 0}

## Key Dependencies
${
  summary?.dependencies && Array.isArray(summary.dependencies)
    ? summary.dependencies.map((dep) => `- ${dep}`).join("\n")
    : summary?.dependencies && typeof summary.dependencies === 'object'
    ? Object.keys(summary.dependencies).map((dep) => `- ${dep}`).join("\n")
    : "None"
}

## Recent Development Discussions
${recentDiscussions}

## Project Structure Insights
- Main configuration files: ${
      summary?.configFiles?.join(", ") || "None identified"
    }
- Scripts available: ${
      summary?.scripts ? Object.keys(summary.scripts).join(", ") : "None"
    }

## Recent Changes
${this.context.recentChanges
  .slice(-5)
  .map(
    (change) => {
      const filePath = change.filePath || change.operation?.filePath || 'unknown';
      const operation = change.operation?.operation || change.operation || 'unknown';
      const timestamp = change.timestamp instanceof Date 
        ? change.timestamp.toISOString() 
        : change.timestamp || new Date().toISOString();
      return `- ${timestamp}: ${filePath} (${operation})`;
    }
  )
  .join("\n")}

## Learning Notes
*(This section is auto-generated based on chat history and project analysis)*`;
  }

  async updateKnowledgeBase() {
    const knowledgeContent = await this.generateKnowledgeSummary();
    await this.saveKnowledge(knowledgeContent);
    return knowledgeContent;
  }

  addToHistory(role, content) {
    this.context.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    if (this.context.conversationHistory.length > 50) {
      this.context.conversationHistory =
        this.context.conversationHistory.slice(-50);
    }

    this.saveHistory();
  }

  getConversationHistory() {
    return this.context.conversationHistory;
  }

  clearContext() {
    this.context.currentFiles = [];
    this.context.recentChanges = [];
  }

  async getSystemPrompt() {
    const summary = this.context.projectSummary;
    const currentFiles = this.context.currentFiles;
    const knowledge = await this.loadKnowledge();

    let prompt = `You are an expert AI coding assistant with deep knowledge of this specific project.

PROJECT CONTEXT:
- Project: ${summary?.projectName || "Unknown"}
- Files: ${summary?.fileCount || 0} total files
- Type: ${Object.keys(summary?.fileTypes || {}).join(", ") || "Unknown"}
- History: ${this.context.conversationHistory.length} previous messages

`;

    if (knowledge) {
      prompt += `\nPROJECT KNOWLEDGE BASE:
${knowledge.substring(0, 1000)}...\n\n`;
    }

    if (currentFiles.length > 0) {
      prompt += "CURRENTLY LOADED FILES:\n";
      currentFiles.forEach((file) => {
        prompt += `- ${file.path} (${file.lines} lines)\n`;
      });
      prompt += "\n";
    }

    const recentMessages = this.context.conversationHistory.slice(-5);
    if (recentMessages.length > 0) {
      prompt += "RECENT CONVERSATION:\n";
      recentMessages.forEach((msg) => {
        prompt += `${msg.role.toUpperCase()}: ${msg.content.substring(
          0,
          200
        )}...\n`;
      });
      prompt += "\n";
    }

    prompt += `CAPABILITIES:
1. Analyze code and suggest improvements
2. Edit files (create, update, replace content)
3. Provide project summaries
4. Search for code patterns
5. Explain code functionality
6. Remember project context from previous sessions

When suggesting edits, be specific about file paths and exact changes.`;

    return prompt;
  }

  // File context management
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
    for (const match of matches.slice(0, 5)) {
      await this.addFileToContext(match.file);
    }
    return matches;
  }

  async updateFileContext(filePath, operation, result) {
    // Only update context for successful operations
    if (!result || result.success === false) {
      return;
    }

    if (operation === "delete") {
      this.context.currentFiles = this.context.currentFiles.filter(
        (file) => file.path !== filePath
      );
    }
    else if (result.newContent || result.content) {
      // Use newContent if available (from update/replace operations), otherwise use content
      const fileContent = result.newContent || result.content;
      // Filter out any undefined entries first
      this.context.currentFiles = this.context.currentFiles.filter(f => f && f.path);
      const existingIndex = this.context.currentFiles.findIndex(
        (file) => file && file.path === filePath
      );

      if (existingIndex !== -1) {
        this.context.currentFiles[existingIndex] = {
          path: filePath,
          content: fileContent,
          lines: fileContent.split("\n").length,
          size: fileContent.length,
        };
      } else {
        try {
          const fileContentData = await this.analyzer.readFile(filePath);
          this.context.currentFiles.push(fileContentData);
        } catch (error) {
          console.warn(
            `Could not update context for ${filePath}: ${error.message}`
          );
        }
      }
    }

    // Track this change in recentChanges
    this.context.recentChanges.push({
      filePath,
      operation,
      result,
      timestamp: new Date(),
    });

    // Limit recentChanges to last 20 entries to prevent memory issues
    if (this.context.recentChanges.length > 20) {
      this.context.recentChanges = this.context.recentChanges.slice(-20);
    }
  }
}

module.exports = ProjectContext;
