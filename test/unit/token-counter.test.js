const { TokenCounter } = require('../../src/core/TokenCounter');

describe('TokenCounter', () => {
  let counter;

  beforeEach(() => {
    counter = new TokenCounter();
  });

  describe('count', () => {
    test('should estimate tokens (4 chars per token)', () => {
      expect(counter.count('hello')).toBe(2); // 5 chars / 4 = 1.25 -> 2
      expect(counter.count('hello world')).toBe(3); // 11 chars / 4 = 2.75 -> 3
      expect(counter.count('')).toBe(0);
    });

    test('should handle non-strings', () => {
      expect(counter.count(null)).toBe(0);
      expect(counter.count(undefined)).toBe(0);
      expect(counter.count(123)).toBe(0);
    });
  });

  describe('fits', () => {
    test('should check if text fits budget', () => {
      expect(counter.fits('hello', 10)).toBe(true);
      expect(counter.fits('x'.repeat(100), 10)).toBe(false);
    });
  });

  describe('truncate', () => {
    test('should truncate from end by default', () => {
      const text = 'x'.repeat(100);
      const truncated = counter.truncate(text, 10);
      expect(truncated.length).toBeLessThan(text.length);
      expect(truncated).toContain('...');
    });

    test('should truncate from start if fromEnd=false', () => {
      const text = 'x'.repeat(100);
      const truncated = counter.truncate(text, 10, { fromEnd: false });
      expect(truncated).toContain('...');
      expect(truncated.startsWith('...')).toBe(true);
    });

    test('should not truncate if fits', () => {
      const text = 'hello';
      const truncated = counter.truncate(text, 10);
      expect(truncated).toBe(text);
    });
  });

  describe('sum', () => {
    test('should sum tokens from array of strings', () => {
      const items = ['hello', 'world', 'test'];
      expect(counter.sum(items)).toBeGreaterThan(0);
    });

    test('should sum tokens from array of objects with content', () => {
      const items = [
        { content: 'hello' },
        { content: 'world' }
      ];
      expect(counter.sum(items)).toBeGreaterThan(0);
    });
  });
});
