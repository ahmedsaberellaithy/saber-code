const Logger = require('../../src/utils/logger');
const chalk = require('chalk');

// Mock console methods
const originalConsole = { ...console };
const mockConsole = {
  log: jest.fn()
};

describe('Logger', () => {
  beforeAll(() => {
    global.console = { ...originalConsole, ...mockConsole };
  });

  afterAll(() => {
    global.console = originalConsole;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DEBUG;
  });

  describe('info', () => {
    test('should log info message with blue color', () => {
      Logger.info('Test info message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️  Test info message')
      );
    });
  });

  describe('success', () => {
    test('should log success message with green color', () => {
      Logger.success('Test success message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Test success message')
      );
    });
  });

  describe('warning', () => {
    test('should log warning message with yellow color', () => {
      Logger.warning('Test warning message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Test warning message')
      );
    });
  });

  describe('error', () => {
    test('should log error message with red color', () => {
      Logger.error('Test error message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Test error message')
      );
    });
  });

  describe('debug', () => {
    test('should not log debug message when DEBUG is not set', () => {
      delete process.env.DEBUG;
      Logger.debug('Test debug message');

      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    test('should log debug message when DEBUG is set', () => {
      process.env.DEBUG = '1';
      const Logger = require('../../src/utils/logger');
      Logger.debug('Test debug message');

      expect(mockConsole.log).toHaveBeenCalled();
      
      delete process.env.DEBUG;
    });
  });

  describe('chat', () => {
    test('should log user message with green color', () => {
      Logger.chat('user', 'Test user message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('💬 You: Test user message')
      );
    });

    test('should log assistant message with blue color', () => {
      Logger.chat('assistant', 'Test assistant message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('🤖 Assistant: Test assistant message')
      );
    });

    test('should handle other roles', () => {
      Logger.chat('system', 'Test system message');

      expect(mockConsole.log).toHaveBeenCalled();
    });
  });

  describe('static methods', () => {
    test('should have all static methods defined', () => {
      expect(typeof Logger.info).toBe('function');
      expect(typeof Logger.success).toBe('function');
      expect(typeof Logger.warning).toBe('function');
      expect(typeof Logger.error).toBe('function');
      expect(typeof Logger.debug).toBe('function');
      expect(typeof Logger.chat).toBe('function');
    });
  });
});

