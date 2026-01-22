/**
 * ContextManager: token-aware context (files, messages, recent changes) with pruning.
 */

const { TokenCounter } = require('./TokenCounter');

class ContextManager {
  /**
   * @param {import('./Config').Config} config
   * @param {import('./TokenCounter').TokenCounter} [tokenCounter]
   */
  constructor(config, tokenCounter) {
    this.config = config;
    this.tokens = tokenCounter || new TokenCounter();
    this._files = new Map(); // path -> { path, content }
    this._messages = [];
    this._recentChanges = [];

    const ctx = config.context;
    this.maxMessages = ctx.maxConversationMessages ?? 50;
    this.maxRecentChanges = ctx.maxRecentChanges ?? 20;
    this.maxContextTokens = ctx.maxContextTokens ?? 8000;
    this.maxFiles = config.limits?.maxFilesInContext ?? 20;
  }

  addFile(path, content) {
    const ent = { path, content: typeof content === 'string' ? content : String(content) };
    this._files.set(path, ent);
    if (this._files.size > this.maxFiles) {
      const first = this._files.keys().next().value;
      this._files.delete(first);
    }
    return this;
  }

  addMessage(role, content) {
    this._messages.push({ role, content: typeof content === 'string' ? content : String(content) });
    while (this._messages.length > this.maxMessages) {
      this._messages.shift();
    }
    return this;
  }

  addRecentChange(change) {
    this._recentChanges.push(change);
    while (this._recentChanges.length > this.maxRecentChanges) {
      this._recentChanges.shift();
    }
    return this;
  }

  getFiles() {
    return [...this._files.values()];
  }

  getMessages() {
    return [...this._messages];
  }

  getRecentChanges() {
    return [...this._recentChanges];
  }

  clear() {
    this._files.clear();
    this._messages.length = 0;
    this._recentChanges.length = 0;
    return this;
  }

  clearFiles() {
    this._files.clear();
    return this;
  }

  /**
   * Build context string for system/user prompt, pruned to fit maxTokens.
   * @param {number} [maxTokens] - default from config
   * @returns {{ text: string, tokens: number }}
   */
  getContextForPrompt(maxTokens = this.maxContextTokens) {
    const sections = [];

    const files = this.getFiles();
    if (files.length) {
      const fileBlock = files
        .map((f) => `### File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
        .join('\n\n');
      sections.push({ key: 'files', text: `## Loaded files\n\n${fileBlock}` });
    }

    const changes = this.getRecentChanges();
    if (changes.length) {
      const changeBlock = changes
        .map((c) => `- ${c.path}: ${c.operation || 'modified'}`)
        .join('\n');
      sections.push({ key: 'changes', text: `## Recent changes\n\n${changeBlock}` });
    }

    const msgs = this.getMessages();
    if (msgs.length) {
      const msgBlock = msgs
        .slice(-10)
        .map((m) => `**${m.role}**: ${m.content.slice(0, 500)}${m.content.length > 500 ? '...' : ''}`)
        .join('\n\n');
      sections.push({ key: 'history', text: `## Recent conversation\n\n${msgBlock}` });
    }

    let total = 0;
    const used = [];
    for (const s of sections) {
      const n = this.tokens.count(s.text);
      if (total + n <= maxTokens) {
        used.push(s);
        total += n;
      } else {
        const remaining = maxTokens - total;
        if (remaining > 100) {
          const truncated = this.tokens.truncate(s.text, remaining, { ellipsis: true, fromEnd: true });
          used.push({ ...s, text: truncated });
          total += this.tokens.count(truncated);
        }
        break;
      }
    }

    const text = used.length ? used.map((u) => u.text).join('\n\n') : '';
    return { text, tokens: total };
  }

  /**
   * Total token count of current context (files + changes + messages).
   */
  tokenCount() {
    const { text } = this.getContextForPrompt(Number.MAX_SAFE_INTEGER);
    return this.tokens.count(text);
  }
}

module.exports = { ContextManager };
