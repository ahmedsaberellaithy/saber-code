const { OllamaClient } = require('../../src/core/OllamaClient');
const { Config } = require('../../src/core/Config');
const axios = require('axios');

jest.mock('axios');

describe('OllamaClient', () => {
  let ollamaClient;
  let mockAxiosInstance;
  let config;

  beforeEach(async () => {
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn()
    };
    
    axios.create.mockReturnValue(mockAxiosInstance);
    config = new Config(process.cwd());
    await config.load();
    ollamaClient = new OllamaClient(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with Config', () => {
      expect(ollamaClient.config).toBe(config);
      expect(ollamaClient.defaultModel).toBe(config.ollama.defaultModel);
    });
  });

  describe('generate', () => {
    test('should generate response with default options', async () => {
      const mockResponse = {
        data: {
          response: 'Test response',
          model: config.ollama.defaultModel,
          created_at: '2024-01-01T00:00:00Z',
          done: true
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await ollamaClient.generate('Test prompt');

      expect(result.content).toBe('Test response');
      expect(result.model).toBe(config.ollama.defaultModel);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          model: config.ollama.defaultModel,
          prompt: 'Test prompt',
          stream: false,
          options: expect.objectContaining({
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 2048
          })
        }),
        expect.objectContaining({
          timeout: 120000
        })
      );
    });

    test('should generate with custom options', async () => {
      const mockResponse = {
        data: {
          response: 'Custom response',
          model: 'mistral',
          created_at: '2024-01-01T00:00:00Z',
          done: true
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await ollamaClient.generate('Test prompt', {
        model: 'mistral',
        temperature: 0.9,
        top_p: 0.95,
        num_predict: 4096,
        stream: false
      });

      expect(result.content).toBe('Custom response');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          model: 'mistral',
          options: expect.objectContaining({
            temperature: 0.9,
            top_p: 0.95,
            num_predict: 4096
          })
        }),
        expect.any(Object)
      );
    });

    test('should use model-specific timeout', async () => {
      const mockResponse = {
        data: {
          response: 'Response',
          model: 'codellama:70b',
          created_at: '2024-01-01T00:00:00Z',
          done: true
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await ollamaClient.generate('Test prompt', { model: 'codellama:70b' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 300000
        })
      );
    });

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ECONNABORTED';
      mockAxiosInstance.post.mockRejectedValue(timeoutError);

      await expect(
        ollamaClient.generate('Test prompt', { model: 'slow-model' })
      ).rejects.toThrow('Ollama timeout: slow-model is too slow');
    });

    test('should handle connection refused errors', async () => {
      const connError = new Error('Connection refused');
      connError.code = 'ECONNREFUSED';
      mockAxiosInstance.post.mockRejectedValue(connError);

      await expect(
        ollamaClient.generate('Test prompt')
      ).rejects.toThrow('Ollama is not running');
    });

    test('should handle streaming', async () => {
      const { Readable } = require('stream');
      const stream = new Readable({
        read() {
          this.push('{"response":"Hello","done":false}\n');
          this.push('{"response":" World","done":true}\n');
          this.push(null);
        }
      });

      mockAxiosInstance.post.mockResolvedValue({ data: stream });

      const gen = await ollamaClient.generate('Test', { stream: true });
      const chunks = [];
      for await (const { chunk, done } of gen) {
        chunks.push({ chunk, done });
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].chunk).toBe('Hello');
      expect(chunks[0].done).toBe(false);
      expect(chunks[1].chunk).toBe(' World');
      expect(chunks[1].done).toBe(true);
    });
  });

  describe('chat', () => {
    test('should convert messages to prompt and call generate', async () => {
      const mockResponse = {
        data: {
          response: 'Chat response',
          model: 'codellama:13b',
          created_at: '2024-01-01T00:00:00Z',
          done: true
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'How are you?' }
      ];

      const result = await ollamaClient.chat(messages);

      expect(result.content).toBe('Chat response');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          prompt: expect.stringContaining('[INST] Hello [/INST]')
        }),
        expect.any(Object)
      );
    });
  });

  describe('messagesToPrompt', () => {
    test('should format user messages with [INST] tags', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const prompt = ollamaClient.messagesToPrompt(messages);
      expect(prompt).toContain('[INST] Hello [/INST]');
    });

    test('should format assistant messages without tags', () => {
      const messages = [{ role: 'assistant', content: 'Hi there' }];
      const prompt = ollamaClient.messagesToPrompt(messages);
      expect(prompt).toBe('Hi there');
    });

    test('should format system messages with <<SYS>> tags', () => {
      const messages = [{ role: 'system', content: 'You are a helpful assistant' }];
      const prompt = ollamaClient.messagesToPrompt(messages);
      expect(prompt).toContain('<<SYS>>');
      expect(prompt).toContain('You are a helpful assistant');
      expect(prompt).toContain('<</SYS>>');
    });

    test('should handle mixed message types', () => {
      const messages = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant response' }
      ];
      const prompt = ollamaClient.messagesToPrompt(messages);
      expect(prompt).toContain('<<SYS>>');
      expect(prompt).toContain('[INST] User message [/INST]');
      expect(prompt).toContain('Assistant response');
    });
  });

  describe('listModels', () => {
    test('should list available models', async () => {
      const mockResponse = {
        data: {
        models: [
          { name: config.ollama.defaultModel, size: 7000000000 },
            { name: 'mistral', size: 4000000000 }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const models = await ollamaClient.listModels();

      expect(models).toHaveLength(2);
      expect(models[0].name).toBe(config.ollama.defaultModel);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tags');
    });

    test('should handle listModels errors', async () => {
      const error = new Error('Failed to fetch models');
      error.code = 'ECONNREFUSED';
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(ollamaClient.listModels()).rejects.toThrow(
        'Ollama is not running'
      );
    });
  });

  describe('getModelInfo', () => {
    test('should get model information', async () => {
      const mockResponse = {
        data: {
          modelfile: `FROM ${config.ollama.defaultModel}`,
          parameters: 'temperature 0.7',
          template: 'test template'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const info = await ollamaClient.getModelInfo(config.ollama.defaultModel);

      expect(info.modelfile).toBe(`FROM ${config.ollama.defaultModel}`);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/show',
        { name: config.ollama.defaultModel }
      );
    });
  });
});
