/**
 * Approximate token counting for context budgeting.
 * Uses ~4 chars per token heuristic (typical for English/code). Ollama/Llama
 * tokenizers vary by model; this is for pruning/limits only.
 */

const DEFAULT_CHARS_PER_TOKEN = 4;

class TokenCounter {
  /**
   * @param {Object} [options]
   * @param {number} [options.charsPerToken]
   */
  constructor(options = {}) {
    this.charsPerToken = options.charsPerToken ?? DEFAULT_CHARS_PER_TOKEN;
  }

  /**
   * Estimate token count for a string.
   * @param {string} text
   * @returns {number}
   */
  count(text) {
    if (typeof text !== 'string') return 0;
    return Math.ceil(text.length / this.charsPerToken);
  }

  /**
   * Check if text fits within token budget.
   * @param {string} text
   * @param {number} budget
   * @returns {boolean}
   */
  fits(text, budget) {
    return this.count(text) <= budget;
  }

  /**
   * Truncate text to fit within maxTokens, optionally adding ellipsis.
   * @param {string} text
   * @param {number} maxTokens
   * @param {Object} [opts]
   * @param {boolean} [opts.ellipsis]
   * @param {boolean} [opts.fromEnd] - truncate from end (keep start) vs start (keep end)
   * @returns {string}
   */
  truncate(text, maxTokens, opts = {}) {
    const { ellipsis = true, fromEnd = true } = opts;
    const maxChars = Math.max(0, maxTokens * this.charsPerToken - (ellipsis ? 3 : 0));
    if (typeof text !== 'string' || text.length <= maxChars) return text ?? '';
    const tail = ellipsis ? '...' : '';
    if (fromEnd) {
      return text.slice(0, maxChars) + tail;
    }
    return tail + text.slice(-maxChars);
  }

  /**
   * Sum token counts for an array of strings or { content } objects.
   * @param {Array<string|{content:string}>} items
   * @returns {number}
   */
  sum(items) {
    if (!Array.isArray(items)) return 0;
    return items.reduce((acc, it) => {
      const s = typeof it === 'string' ? it : (it && it.content);
      return acc + this.count(s);
    }, 0);
  }
}

module.exports = { TokenCounter, DEFAULT_CHARS_PER_TOKEN };
