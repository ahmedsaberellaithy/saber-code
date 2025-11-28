const OllamaInterface = require('./src/core/ollamaInterface');
const OllamaClient = require('./src/core/ollamaClient');
const ProjectContext = require('./src/core/projectContext');
const FileEditor = require('./src/core/fileEditor');
const CodeAnalyzer = require('./src/features/codeAnalyzer');

const client = new OllamaInterface();

module.exports = {
  OllamaInterface,
  OllamaClient,
  ProjectContext,
  FileEditor,
  CodeAnalyzer,
  client
};