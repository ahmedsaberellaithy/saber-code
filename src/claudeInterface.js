const OllamaClient = require('./ollamaClient');
const ProjectContext = require('./projectContext');
const FileEditor = require('./fileEditor');

class ClaudeInterface {
  constructor(options = {}) {
    this.ollama = new OllamaClient(
      options.baseURL,
      options.defaultModel || 'codellama'
    );
    this.projectContext = new ProjectContext(options.rootPath);
    this.fileEditor = new FileEditor(options.rootPath);
    this.defaultOptions = {
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 4096,
      top_p: options.top_p || 0.9
    };
    
    this.messages = {
      create: this.createMessage.bind(this)
    };
  }

  async initialize() {
    await this.projectContext.initialize();
    return this.projectContext.context;
  }

  async createMessage(params) {
    const { messages, ...options } = params;

    // Add system prompt with project context
    const systemPrompt = this.projectContext.getSystemPrompt();
    const enhancedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await this.ollama.chat(enhancedMessages, {
      ...this.defaultOptions,
      ...options
    });

    // Add to conversation history
    this.projectContext.addToHistory('user', messages[messages.length - 1].content);
    this.projectContext.addToHistory('assistant', response.content);

    return {
      id: `ollama-${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: response.content }],
      model: response.model,
      stop_reason: 'end_turn'
    };
  }

  async analyzeCode(filePath) {
    const fileContent = await this.projectContext.addFileToContext(filePath);
    
    const analysisPrompt = `Analyze this code file and provide:
1. Purpose and functionality
2. Key functions/classes
3. Potential issues or improvements
4. Dependencies and relationships

File: ${filePath}
Code:
\`\`\`
${fileContent.content}
\`\`\``;

    return this.createMessage({
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 2048
    });
  }

  async getProjectSummary() {
    const summary = await this.projectContext.initialize();
    
    const summaryPrompt = `Provide a comprehensive project summary based on this data:

${JSON.stringify(summary, null, 2)}

Please analyze:
1. Project type and technology stack
2. Key configuration and dependencies
3. Project structure insights
4. Potential setup or configuration issues`;

    return this.createMessage({
      messages: [{ role: 'user', content: summaryPrompt }],
      max_tokens: 2048
    });
  }

  async applyCodeChanges(editDescription) {
    // First, let the AI suggest specific edits
    const editPrompt = `Based on this edit request: "${editDescription}"

Please provide specific file operations in JSON format. Consider the current project context and suggest:

1. Which files to modify
2. What operations to perform (create, update, replace, insert, delete)
3. Exact content changes

Return your response as JSON with this structure:
{
  "reasoning": "brief explanation of changes",
  "operations": [
    {
      "filePath": "path/to/file.js",
      "operation": "update|create|replace|insert|delete",
      "content": "new content for create/update",
      "oldContent": "content to replace (for replace operation)",
      "newContent": "new content (for replace operation)", 
      "line": 10 (for insert operation)
    }
  ]
}`;

    const response = await this.createMessage({
      messages: [{ role: 'user', content: editPrompt }],
      temperature: 0.3 // Lower temperature for more deterministic edits
    });

    // Parse the JSON response and apply edits
    try {
      const editPlan = JSON.parse(response.content[0].text);
      const results = [];

      for (const operation of editPlan.operations) {
        const result = await this.fileEditor.applyEdit(operation);
        results.push(result);
        
        // Add to recent changes
        this.projectContext.context.recentChanges.push({
          operation,
          result,
          timestamp: new Date()
        });
      }

      return {
        reasoning: editPlan.reasoning,
        operations: results,
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse or apply edits: ${error.message}`,
        rawResponse: response.content[0].text
      };
    }
  }

  async searchCode(searchTerm) {
    const matches = await this.projectContext.searchAndAddFiles(searchTerm);
    
    const searchPrompt = `I found ${matches.length} files containing "${searchTerm}".

Please analyze the code patterns and provide:
1. Common usage patterns
2. Potential refactoring opportunities
3. Related functionality
4. Any issues or improvements needed`;

    return this.createMessage({
      messages: [{ role: 'user', content: searchPrompt }],
      max_tokens: 2048
    });
  }

  async complete(prompt, options = {}) {
    const response = await this.ollama.generate(prompt, {
      ...this.defaultOptions,
      ...options
    });

    return {
      completion: response.content,
      model: response.model
    };
  }

  async listModels() {
    return this.ollama.listModels();
  }

  // Context management
  async loadFiles(filePatterns) {
    return this.projectContext.addMultipleFiles(filePatterns);
  }

  clearContext() {
    this.projectContext.clearContext();
  }

  getContext() {
    return this.projectContext.context;
  }
}

module.exports = ClaudeInterface;