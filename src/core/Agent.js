/**
 * Agent: tool orchestration and conversation loop.
 * Uses Config, OllamaClient, ContextManager, ToolRegistry.
 */

const { Config } = require('./Config');
const { OllamaClient } = require('./OllamaClient');
const { TokenCounter } = require('./TokenCounter');
const { ContextManager } = require('./ContextManager');
const { createRegistry } = require('../tools');
const { FileUtils } = require('../utils/fileUtils');

const SYSTEM_PROMPT = `You are a helpful coding assistant running locally via Ollama. You have access to the project context (loaded files, recent changes, conversation history). Be concise and accurate. When editing code, suggest specific changes.`;

const WRITE_TOOLS = new Set(['write', 'edit']);

class Agent {
  /**
   * @param {import('./Config').Config} [config]
   * @param {Object} [opts]
   * @param {import('./OllamaClient')} [opts.ollamaClient]
   * @param {import('./ContextManager')} [opts.contextManager]
   * @param {import('../tools/registry').ToolRegistry} [opts.toolRegistry]
   * @param {import('../utils/fileUtils').FileUtils} [opts.fileUtils]
   */
  constructor(config, opts = {}) {
    this.config = config || new Config(process.cwd());
    this.fileUtils = opts.fileUtils || new FileUtils(this.config.rootPath);
    this.tokens = opts.tokenCounter || new TokenCounter();
    this.context = opts.contextManager || new ContextManager(this.config, this.tokens);
    this.ollama = opts.ollamaClient || new OllamaClient(this.config);
    this.tools = opts.toolRegistry || createRegistry();
  }

  _toolContext() {
    return {
      rootPath: this.config.rootPath,
      fileUtils: this.fileUtils,
      config: this.config
    };
  }

  /**
   * Run a tool by name. Updates context with recent change for write/edit.
   */
  async runTool(name, args) {
    const ctx = this._toolContext();
    const result = await this.tools.run(name, ctx, args);
    if (WRITE_TOOLS.has(name) && result && result.path) {
      this.context.addRecentChange({
        path: result.path,
        operation: result.operation || 'write'
      });
    }
    return result;
  }

  /**
   * Add file to context (path + content).
   */
  addFile(path, content) {
    this.context.addFile(path, content);
    return this;
  }

  /**
   * Clear context (files, messages, recent changes).
   */
  clearContext() {
    this.context.clear();
    return this;
  }

  /**
   * Get context summary for prompt.
   */
  getContextForPrompt(maxTokens) {
    return this.context.getContextForPrompt(maxTokens);
  }

  /**
   * Build messages for Ollama: system + context + history + user.
   */
  _buildMessages(userMessage, opts = {}) {
    const maxContextTokens = opts.maxContextTokens ?? this.config.context.maxContextTokens;
    const { text: contextBlock } = this.context.getContextForPrompt(Math.floor(maxContextTokens * 0.5));

    const systemParts = [SYSTEM_PROMPT];
    if (contextBlock) systemParts.push('\n\n---\n\nProject context:\n\n' + contextBlock);

    const messages = [{ role: 'system', content: systemParts.join('') }];
    const history = this.context.getMessages();
    for (const m of history) {
      if (m.role === 'system') continue;
      messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: 'user', content: userMessage });
    return messages;
  }

  /**
   * Single turn: user message -> model reply. Updates context. Stream or non-stream.
   */
  async chat(userMessage, options = {}) {
    const stream = options.stream ?? false;
    const model = options.model ?? this.ollama.defaultModel;

    this.context.addMessage('user', userMessage);

    const messages = this._buildMessages(userMessage, options);
    const response = stream
      ? await this.ollama.chat(messages, { ...options, model, stream: true })
      : await this.ollama.chat(messages, { ...options, model, stream: false });

    if (stream) {
      let full = '';
      const self = this;
      return {
        async *[Symbol.asyncIterator]() {
          for await (const { chunk, done } of response) {
            full += chunk;
            yield { chunk, done };
          }
          self.context.addMessage('assistant', full);
        }
      };
    }

    const content = response.content ?? '';
    this.context.addMessage('assistant', content);
    return { content, model: response.model, done: response.done };
  }
}

module.exports = { Agent };
