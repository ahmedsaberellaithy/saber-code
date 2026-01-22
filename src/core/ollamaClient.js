const axios = require('axios');

/**
 * Clean Ollama API client with streaming support.
 * Uses Config for baseURL, model, timeouts. Supports generate (stream + non-stream) and chat.
 */
class OllamaClient {
  /**
   * @param {import('./Config').Config} config - Config instance (uses ollama settings)
   */
  constructor(config) {
    this.config = config;
    const { baseURL, timeout } = config.ollama;
    this.client = axios.create({
      baseURL,
      timeout,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  get defaultModel() {
    return this.config.ollama.defaultModel;
  }

  /**
   * Convert messages (Claude-style) to single prompt for /api/generate.
   * Uses Llama-style [INST], <<SYS>> tags.
   */
  messagesToPrompt(messages) {
    return messages
      .map((msg) => {
        switch (msg.role) {
          case 'user':
            return `[INST] ${msg.content} [/INST]`;
          case 'assistant':
            return msg.content;
          case 'system':
            return `<<SYS>>\n${msg.content}\n<</SYS>>`;
          default:
            return msg.content;
        }
      })
      .join('\n\n');
  }

  /**
   * Generate completion. Non-streaming: returns full response. Streaming: async generator.
   * @param {string} prompt
   * @param {Object} options
   * @param {string} [options.model]
   * @param {number} [options.temperature]
   * @param {number} [options.top_p]
   * @param {number} [options.num_predict]
   * @param {boolean} [options.stream]
   * @returns {Promise<{content:string,model:string,done:boolean}>|AsyncGenerator<{chunk:string,done:boolean}>}
   */
  async generate(prompt, options = {}) {
    const model = options.model ?? this.defaultModel;
    const stream = options.stream ?? false;
    const opts = this.config.ollama.generate;
    const body = {
      model,
      prompt,
      stream,
      options: {
        temperature: options.temperature ?? opts.temperature,
        top_p: options.top_p ?? opts.top_p,
        num_predict: options.num_predict ?? opts.num_predict
      }
    };

    const timeout = this.config.getModelTimeout(model);

    try {
      if (!stream) {
        const res = await this.client.post('/api/generate', body, {
          timeout,
          timeoutErrorMessage: `Ollama timeout: ${model}. Try a smaller model.`
        });
        const d = res.data;
        return {
          content: d.response ?? '',
          model: d.model,
          done: d.done ?? true
        };
      }

      const res = await this.client.post('/api/generate', body, {
        timeout,
        responseType: 'stream',
        timeoutErrorMessage: `Ollama timeout: ${model}. Try a smaller model.`
      });

      return this._streamNdjson(res.data, 'response');
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        throw new Error(`Ollama timeout: ${model} is too slow. Try a smaller model.`);
      }
      if (err.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Start it with: ollama serve');
      }
      throw new Error(`Ollama API error: ${err.message}`);
    }
  }

  /**
   * Chat: messages -> prompt -> generate. Same options as generate.
   */
  async chat(messages, options = {}) {
    const prompt = this.messagesToPrompt(messages);
    return this.generate(prompt, options);
  }

  /**
   * Parse NDJSON stream and yield { chunk, done } from field (e.g. 'response').
   * @param {NodeJS.ReadableStream} stream
   * @param {string} field - JSON field holding the chunk text
   */
  async *_streamNdjson(stream, field) {
    let buffer = '';
    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed);
          const text = obj[field];
          if (text != null) yield { chunk: text, done: obj.done ?? false };
        } catch (_) {
          // skip malformed lines
        }
      }
    }
    if (buffer.trim()) {
      try {
        const obj = JSON.parse(buffer.trim());
        const text = obj[field];
        if (text != null) yield { chunk: text, done: obj.done ?? true };
      } catch (_) {}
    }
  }

  async listModels() {
    try {
      const res = await this.client.get('/api/tags');
      return res.data.models ?? [];
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Start it with: ollama serve');
      }
      throw new Error(`Failed to list models: ${err.message}`);
    }
  }

  async getModelInfo(modelName) {
    try {
      const res = await this.client.post('/api/show', { name: modelName });
      return res.data;
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Start it with: ollama serve');
      }
      throw new Error(`Failed to get model info: ${err.message}`);
    }
  }
}

module.exports = { OllamaClient };
