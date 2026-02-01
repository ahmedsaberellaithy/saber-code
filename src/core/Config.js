const path = require('path');
const fs = require('fs').promises;

// Load environment variables from .env file
require('dotenv').config();

const DEFAULT_CONFIG = {
  ollama: {
    baseURL: process.env.SABER_CODE_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434',
    defaultModel: process.env.SABER_CODE_MODEL || process.env.SABER_MODEL || 'qwen2.5-coder:32b-instruct', // Updated: Best model (see MODEL_COMPARISON.md)
    timeout: parseInt(process.env.SABER_CODE_TIMEOUT) || 120000,
    modelTimeouts: {
      'codellama:70b': 300000,
      'llama2:70b': 300000,
      'wizardcoder:15b': 180000,
      'codellama:13b': 120000,
      default: 120000
    },
    generate: {
      temperature: 0.7,
      top_p: 0.9,
      num_predict: 2048
    }
  },
  context: {
    maxConversationMessages: 50,
    maxRecentChanges: 20,
    maxContextTokens: 8000,
    knowledgeUpdateInterval: 5
  },
  project: {
    historyDir: '.saber-chat-history',
    chatHistoryFile: 'chat_history.json',
    knowledgeFile: 'intro_to_project.md',
    planFile: 'plan.json'
  },
  limits: {
    maxFilesInContext: 20,
    maxFileSearchResults: 50,
    maxProjectStructureFiles: 100
  }
};

const CONFIG_FILES = ['.saber-code.json', 'saber.config.json', 'saber-code.config.json'];

/**
 * Centralized configuration management.
 * Loads from: config file (project root) > env vars > defaults.
 */
class Config {
  constructor(rootPath = process.cwd()) {
    this.rootPath = path.resolve(rootPath);
    this._config = { ...JSON.parse(JSON.stringify(DEFAULT_CONFIG)) };
    this._loaded = false;
  }

  get root() {
    return this.rootPath;
  }

  get ollama() {
    return this._config.ollama;
  }

  get context() {
    return this._config.context;
  }

  get project() {
    return this._config.project;
  }

  get limits() {
    return this._config.limits;
  }

  /** Path to .saber-chat-history directory */
  get historyDirPath() {
    return path.join(this.rootPath, this._config.project.historyDir);
  }

  /** Path to chat history JSON */
  get chatHistoryPath() {
    return path.join(this.historyDirPath, this._config.project.chatHistoryFile);
  }

  /** Path to knowledge base markdown */
  get knowledgePath() {
    return path.join(this.historyDirPath, this._config.project.knowledgeFile);
  }

  /** Path to plan JSON */
  get planPath() {
    return path.join(this.historyDirPath, this._config.project.planFile);
  }

  /**
   * Load config from project root. Merges with defaults.
   * @returns {Promise<Config>} this
   */
  async load() {
    if (this._loaded) return this;
    for (const name of CONFIG_FILES) {
      const filePath = path.join(this.rootPath, name);
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        const user = JSON.parse(raw);
        this._merge(user);
        break;
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
    }
    this._applyEnvOverrides();
    this._loaded = true;
    return this;
  }

  _merge(user) {
    const deepMerge = (target, source) => {
      for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };
    deepMerge(this._config, user);
  }

  _applyEnvOverrides() {
    // Support both new and legacy env var names
    if (process.env.SABER_CODE_BASE_URL) this._config.ollama.baseURL = process.env.SABER_CODE_BASE_URL;
    if (process.env.OLLAMA_HOST) this._config.ollama.baseURL = process.env.OLLAMA_HOST;
    
    if (process.env.SABER_CODE_MODEL) this._config.ollama.defaultModel = process.env.SABER_CODE_MODEL;
    if (process.env.SABER_MODEL) this._config.ollama.defaultModel = process.env.SABER_MODEL;
    
    if (process.env.SABER_CODE_TIMEOUT) this._config.ollama.timeout = parseInt(process.env.SABER_CODE_TIMEOUT);
    
    if (process.env.SABER_CODE_MAX_TOKENS) this._config.context.maxTokens = parseInt(process.env.SABER_CODE_MAX_TOKENS);
    if (process.env.SABER_CODE_MAX_FILES) this._config.limits.maxFilesInContext = parseInt(process.env.SABER_CODE_MAX_FILES);
    if (process.env.SABER_CODE_MAX_CONVERSATION) this._config.context.maxConversationMessages = parseInt(process.env.SABER_CODE_MAX_CONVERSATION);
  }

  /**
   * Override config values programmatically.
   * @param {Object} overrides - e.g. { ollama: { defaultModel: 'mistral' } }
   */
  override(overrides) {
    this._merge(overrides);
    return this;
  }

  /**
   * Get timeout for a model (ms).
   * @param {string} model
   * @returns {number}
   */
  getModelTimeout(model) {
    return this._config.ollama.modelTimeouts[model] ?? this._config.ollama.modelTimeouts.default;
  }
}

module.exports = { Config, DEFAULT_CONFIG };
