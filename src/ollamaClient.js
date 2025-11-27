const axios = require('axios');

class OllamaClient {
  constructor(baseURL = 'http://localhost:11434', defaultModel = 'codellama:13b') {
    this.baseURL = baseURL;
    this.defaultModel = defaultModel;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 120000
    });
  }

  async generate(prompt, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      top_p = 0.9,
      max_tokens = 2048,
      stream = false
    } = options;

    try {
      const response = await this.client.post('/api/generate', {
        model,
        prompt,
        stream,
        options: {
          temperature,
          top_p,
          num_predict: max_tokens
        }
      });

      return {
        content: response.data.response,
        model: response.data.model,
        created_at: response.data.created_at,
        done: response.data.done
      };
    } catch (error) {
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  async chat(messages, options = {}) {
    const prompt = this.messagesToPrompt(messages);
    return this.generate(prompt, options);
  }

  messagesToPrompt(messages) {
    return messages.map(msg => {
      switch (msg.role) {
        case 'user':
          return `[INST] ${msg.content} [/INST]`;
        case 'assistant':
          return `${msg.content}`;
        case 'system':
          return `<<SYS>> ${msg.content} <</SYS>>`;
        default:
          return msg.content;
      }
    }).join('\n\n');
  }

  async listModels() {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models;
    } catch (error) {
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  async getModelInfo(modelName) {
    try {
      const response = await this.client.post('/api/show', {
        name: modelName
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }
}

module.exports = OllamaClient;