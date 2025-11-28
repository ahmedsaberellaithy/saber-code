const OllamaClient = require('./ollamaClient');
const ProjectContext = require('./projectContext');
const FileEditor = require('./fileEditor');

class OllamaInterface {
  constructor(options = {}) {
    this.ollama = new OllamaClient(
      options.baseURL || 'http://localhost:11434',
      options.defaultModel || 'codellama:13b'
    );
    this.projectContext = new ProjectContext(options.rootPath);
    this.fileEditor = new FileEditor(options.rootPath);
    this.defaultOptions = {
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 4096,
      top_p: options.top_p || 0.9
    };

    // Claude-compatible API
    this.messages = {
      create: this.createMessage.bind(this)
    };
  }

  async initialize() {
    try {
      await this.projectContext.initialize();
      return this.projectContext.context;
    } catch (error) {
      console.warn('Initialization warning:', error.message);
      return this.projectContext.context;
    }
  }

  async createMessage(params) {
    const { messages, model, max_tokens, temperature, top_p, stream } = params;

    const systemPrompt = await this.projectContext.getSystemPrompt();
    const enhancedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await this.ollama.chat(enhancedMessages, {
      model: model || this.ollama.defaultModel,
      max_tokens: max_tokens || this.defaultOptions.max_tokens,
      temperature: temperature || this.defaultOptions.temperature,
      top_p: top_p || this.defaultOptions.top_p,
      stream: stream || false
    });

    const lastUserMessage = messages[messages.length - 1].content;
    this.projectContext.addToHistory('user', lastUserMessage);
    this.projectContext.addToHistory('assistant', response.content);

    const historyLength = this.projectContext.getConversationHistory().length;
    if (historyLength % 5 === 0) {
      await this.updateKnowledge();
    }

    return {
      id: `ollama-${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: response.content }],
      model: response.model,
      stop_reason: 'end_turn',
      usage: { input_tokens: 0, output_tokens: 0 }
    };
  }

  async complete(prompt, options = {}) {
    const response = await this.ollama.generate(prompt, {
      ...this.defaultOptions,
      ...options
    });

    return {
      completion: response.content,
      model: response.model,
      stop_reason: 'stop'
    };
  }

  async analyzeCode(filePath, model = this.ollama.defaultModel) {
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
      model: model,
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 2048
    });
  }

  async getProjectSummary(model = this.ollama.defaultModel) {
    await this.projectContext.initialize();
    const summaryPrompt = `Provide a comprehensive project summary based on the project structure.

Please analyze:
1. Project type and technology stack
2. Key configuration and dependencies
3. Project structure insights
4. Potential setup or configuration issues
5. Recommendations for improvement`;

    return this.createMessage({
      model: model,
      messages: [{ role: 'user', content: summaryPrompt }],
      max_tokens: 2048
    });
  }

  async applyCodeChanges(editDescription, model = this.ollama.defaultModel) {
    const editPrompt = `Based on this edit request: "${editDescription}"

Please provide specific file operations in JSON format. Consider the current project context and suggest:

1. Which files to modify
2. What operations to perform (create, update, replace, insert, delete)
3. Exact content changes

Return ONLY valid JSON with this structure:
{
  "reasoning": "brief explanation of changes",
  "operations": [
    {
      "filePath": "path/to/file.js",
      "operation": "update|create|replace|insert|delete",
      "content": "new content for create/update",
      "oldContent": "content to replace (for replace operation)",
      "newContent": "new content (for replace operation)", 
      "line": 10
    }
  ]
}

Important: Return ONLY the JSON, no additional text or explanations.`;

    const response = await this.createMessage({
      model: model,
      messages: [{ role: 'user', content: editPrompt }],
      temperature: 0.3,
      max_tokens: 4096
    });

    try {
      const responseText = response.content[0].text;
      let jsonString = responseText;
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonString = jsonMatch[0];
      
      jsonString = jsonString
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      const editPlan = JSON.parse(jsonString);
      const results = [];

      if (!editPlan.operations || !Array.isArray(editPlan.operations)) {
        throw new Error('Invalid operations array in AI response');
      }

      for (const operation of editPlan.operations) {
        try {
          if (!operation.filePath || !operation.operation) {
            results.push({
              success: false,
              error: `Missing required fields: filePath or operation`,
              operation
            });
            continue;
          }

          if ((operation.operation === 'update' || operation.operation === 'create') && !operation.content) {
            results.push({
              success: false,
              error: `Missing content for ${operation.operation} operation`,
              operation
            });
            continue;
          }

          if (operation.operation === 'replace' && (!operation.oldContent || !operation.newContent)) {
            results.push({
              success: false,
              error: `Missing oldContent or newContent for replace operation`,
              operation
            });
            continue;
          }

          const result = await this.fileEditor.applyEdit(operation);
          results.push(result);

          this.projectContext.context.recentChanges.push({
            operation,
            result,
            timestamp: new Date()
          });

        } catch (error) {
          results.push({
            success: false,
            error: `Failed to apply operation on ${operation.filePath}: ${error.message}`,
            operation
          });
        }
      }

      return {
        reasoning: editPlan.reasoning || 'No reasoning provided',
        operations: results,
        success: results.every(r => r.success !== false),
        rawResponse: responseText
      };

    } catch (error) {
      console.error('JSON Parse Error:', error.message);
      return {
        success: false,
        error: `Failed to parse AI response: ${error.message}`,
        rawResponse: response.content[0].text,
        parsingError: true
      };
    }
  }

  async searchCode(searchTerm, model = this.ollama.defaultModel) {
    const matches = await this.projectContext.searchAndAddFiles(searchTerm);
    const searchPrompt = `I found ${matches.length} files containing "${searchTerm}".

Please analyze the code patterns and provide:
1. Common usage patterns
2. Potential refactoring opportunities
3. Related functionality
4. Any issues or improvements needed`;

    return this.createMessage({
      model: model,
      messages: [{ role: 'user', content: searchPrompt }],
      max_tokens: 2048
    });
  }

  async updateKnowledge() {
    try {
      const knowledgeContent = await this.projectContext.updateKnowledgeBase();
      return { 
        success: true, 
        message: 'Knowledge base updated',
        filePath: this.projectContext.knowledgeFile
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async getKnowledge() {
    return await this.projectContext.loadKnowledge();
  }

  async loadFiles(filePatterns) {
    return await this.projectContext.addMultipleFiles(filePatterns);
  }

  async listModels() {
    return await this.ollama.listModels();
  }

  getContext() {
    return this.projectContext.context;
  }

  clearContext() {
    this.projectContext.clearContext();
  }

  async refreshKnowledge() {
    return await this.updateKnowledge();
  }

  async getModelInfo(modelName) {
    return await this.ollama.getModelInfo(modelName);
  }
}

module.exports = OllamaInterface;
