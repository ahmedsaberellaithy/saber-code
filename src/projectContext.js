const CodeAnalyzer = require("./codeAnalyzer");
const fs = require("fs").promises;
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
    await this.ensureHistoryDir();
    await this.loadHistory();
    this.context.projectSummary = await this.analyzer.getProjectSummary();
    return this.context;
  }

  async ensureHistoryDir() {
    try {
      await fs.mkdir(this.historyDir, { recursive: true });
    } catch (error) {
      console.warn("Could not create history directory:", error.message);
    }
  }

  async loadHistory() {
    try {
      // Load chat history
      const historyData = await fs.readFile(this.historyFile, "utf8");
      this.context.conversationHistory = JSON.parse(historyData);

      // Load knowledge file exists check
      try {
        await fs.access(this.knowledgeFile);
        this.hasKnowledge = true;
      } catch {
        this.hasKnowledge = false;
      }
    } catch (error) {
      // No history exists yet, start fresh
      this.context.conversationHistory = [];
      this.hasKnowledge = false;
    }
  }

  async saveHistory() {
    try {
      await this.ensureHistoryDir();
      await fs.writeFile(
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
      await fs.writeFile(this.knowledgeFile, knowledgeContent);
      this.hasKnowledge = true;
    } catch (error) {
      console.warn("Could not save knowledge file:", error.message);
    }
  }

  async loadKnowledge() {
    try {
      const content = await fs.readFile(this.knowledgeFile, "utf8");
      return content;
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

    const knowledgeContent = `# Project Knowledge Base
Generated: ${new Date().toISOString()}

## Project Overview
- **Name**: ${summary?.projectName || "Unknown"}
- **Description**: ${summary?.description || "No description"}
- **File Types**: ${Object.keys(summary?.fileTypes || {}).join(", ")}
- **Total Files**: ${summary?.fileCount || 0}

## Key Dependencies
${
  summary?.dependencies
    ? Object.keys(summary.dependencies)
        .map((dep) => `- ${dep}`)
        .join("\n")
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
    (change) =>
      `- ${change.timestamp}: ${change.operation.filePath} (${change.operation.operation})`
  )
  .join("\n")}

## Learning Notes
*(This section is auto-generated based on chat history and project analysis)*`;

    return knowledgeContent;
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

    // Keep only last 50 messages to manage context size
    if (this.context.conversationHistory.length > 50) {
      this.context.conversationHistory =
        this.context.conversationHistory.slice(-50);
    }

    // Auto-save history
    this.saveHistory();
  }

  getConversationHistory() {
    return this.context.conversationHistory;
  }

  clearContext() {
    this.context.currentFiles = [];
    this.context.recentChanges = [];
  }

  // Enhanced system prompt with knowledge base
  async getSystemPrompt() {
    const summary = this.context.projectSummary;
    const currentFiles = this.context.currentFiles;
    const knowledge = await this.loadKnowledge();

    let prompt = `You are an expert AI coding assistant with deep knowledge of this specific project.

PROJECT CONTEXT:
- Project: ${summary?.projectName || "Unknown"}
- Files: ${summary?.fileCount || 0} total files
- Type: ${Object.keys(summary?.fileTypes || {}).join(", ") || "Unknown"}
- History: ${
      this.context.conversationHistory.length
    } previous messages in this project

`;

    if (knowledge) {
      prompt += `\nPROJECT KNOWLEDGE BASE (from previous sessions):
${knowledge.substring(0, 1000)}...\n\n`;
    }

    if (currentFiles.length > 0) {
      prompt += "CURRENTLY LOADED FILES:\n";
      currentFiles.forEach((file) => {
        prompt += `- ${file.path} (${file.lines} lines)\n`;
      });
      prompt += "\n";
    }

    // Add recent conversation context
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
}

module.exports = ProjectContext;
