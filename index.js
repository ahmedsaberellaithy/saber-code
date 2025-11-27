const ClaudeInterface = require('./src/claudeInterface');

// Create default instance
const claude = new ClaudeInterface();

// Export everything
module.exports = {
  ClaudeInterface,
  claude
};