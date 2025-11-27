const OllamaClient = require('./ollamaClient');
const ProjectContext = require('./projectContext');
const FileEditor = require('./FileEditor');

class OllamaInterface {
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

    // Add system prompt with project context and knowledge
    const systemPrompt = await this.projectContext.getSystemPrompt();
    const enhancedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await this.ollama.chat(enhancedMessages, {
      ...this.defaultOptions,
      ...options
    });

    // Add to conversation history
    const lastUserMessage = messages[messages.length - 1].content;
    this.projectContext.addToHistory('user', lastUserMessage);
    this.projectContext.addToHistory('assistant', response.content);

    // Auto-update knowledge base every 5 messages
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
      stop_reason: 'end_turn'
    };
  }

  async updateKnowledge() {
    try {
      const knowledgeContent = await this.projectContext.updateKnowledgeBase();
      return { success: true, message: 'Knowledge base updated' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getKnowledge() {
    return await this.projectContext.loadKnowledge();
  }

  // ... rest of your existing methods (analyzeCode, getProjectSummary, etc.)

  // New method to force knowledge update
  async refreshKnowledge() {
    return await this.updateKnowledge();
  }
}

module.exports = OllamaInterface;