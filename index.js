const OllamaInterface = require('./src/ollamaInterface');

// Create default instance
const client = new OllamaInterface();

// Export everything
module.exports = {
  OllamaInterface,
  client
};