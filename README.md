# Saber Code CLI 🚀

> **Your AI-powered coding companion that keeps your data private**

Saber Code CLI is a powerful command-line interface that replicates the Claude Code experience locally using Ollama. It provides intelligent code analysis, editing, and project management while keeping all your data private on your machine.

## ✨ Features

### 🤖 AI-Powered Assistance
- **Local AI Models**: Uses Ollama models (codellama, mistral, etc.) - no API keys required
- **Claude-Compatible Interface**: Familiar API structure for easy adoption
- **Context-Aware**: Understands your project structure and history

### 📁 Project Intelligence
- **Project Analysis**: Automatic project structure understanding
- **Code Search**: Find patterns and functions across your codebase
- **Smart Summarization**: Get comprehensive project overviews
- **Knowledge Base**: Builds persistent project knowledge across sessions

### ✏️ Intelligent Code Editing
- **Natural Language Edits**: Make code changes using plain English
- **File Operations**: Create, update, replace, insert, and delete files
- **Contextual Understanding**: AI understands your project context for better edits

### 🔒 Privacy & Control
- **100% Local**: Everything runs on your machine
- **No Data Sharing**: Your code never leaves your computer
- **Offline Capable**: Work without internet connection

## 🚀 Quick Start

### Prerequisites

1. **Install Ollama**
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows: Download from https://ollama.ai/download
   ```

2. **Pull a Model**
   ```bash
   ollama pull codellama:13b
   # or other models: mistral, llama2, etc.
   ```

### Installation

```bash
# Clone and install
git clone <your-repo>
cd saber-code-cli
npm install

# Install globally (optional)
npm install -g .
```

### Basic Usage

```bash
# Start interactive chat session
saber-code chat

# Get project summary
saber-code summary

# Analyze a specific file
saber-code analyze src/index.js

# Make code changes with natural language
saber-code edit "Add error handling to the main function"

# Search for code patterns
saber-code search "function calculate"
```

## 📖 Command Reference

### Interactive Chat Mode
```bash
saber-code chat
```
In chat mode, use these commands:
- `/load src/utils.js` - Load files into context
- `/analyze src/app.js` - Analyze specific file
- `/edit "refactor this function"` - Make code changes
- `/summary` - Get project overview
- `/search "TODO"` - Search code patterns
- `/knowledge` - Update project knowledge
- `/history` - Show conversation history
- `help` - Show all commands
- `clear` - Clear session context
- `quit` - Exit chat

### Individual Commands
```bash
# Project Analysis
saber-code summary
saber-code analyze package.json
saber-code load "src/**/*.js" "package.json"

# Code Operations
saber-code edit "Create a new utility function for date formatting"
saber-code search "axios.get"
saber-code models  # List available Ollama models

# Knowledge Management
saber-code knowledge --update
saber-code history
saber-code context
```

## 🛠️ Advanced Usage

### Model Selection
```bash
# Use specific model
saber-code chat --model mistral
saber-code edit --model codellama:13b "Your edit description"

# List available models
saber-code models
```

### Project Context
Saber automatically creates a `.saber-chat-history` directory with:
- `chat_history.json` - Conversation history
- `intro_to_project.md` - Project knowledge base

## 🏗️ Project Structure

```
saber-code-cli/
├── src/
│   ├── core/           # Core functionality
│   │   ├── ollamaInterface.js
│   │   ├── ollamaClient.js
│   │   ├── projectContext.js
│   │   └── fileEditor.js
│   ├── features/       # Specialized features
│   │   └── codeAnalyzer.js
│   └── utils/          # Utility functions
│       ├── fileUtils.js
│       ├── logger.js
│       └── patterns.js
├── cli.js              # Command-line interface
├── index.js            # Main exports
└── test/               # Test suite
```

## 🧪 Testing

```bash
# Run tests
npm test

# Quick smoke test
npm run test:quick
```

## 🔧 Development

### Adding New Features
1. **Core Features**: Add to `src/core/`
2. **Specialized Features**: Add to `src/features/`
3. **Utilities**: Add to `src/utils/`
4. **CLI Commands**: Update `cli.js`

### Example: Adding a New Command
```javascript
// In cli.js
program
  .command('document <file>')
  .description('Generate documentation for a file')
  .action(wrapCommand(async (file) => {
    const response = await ollamaClient.generateDocumentation(file);
    console.log(response);
  }));
```

## 🐛 Troubleshooting

### Common Issues

**Ollama Connection Error**
```bash
# Make sure Ollama is running
ollama serve

# Check if models are available
ollama list
```

**Model Not Found**
```bash
# Pull the required model
ollama pull codellama:13b
```


## 📋 Roadmap

- [ ] **Streaming Responses** - Real-time AI responses
- [ ] **Multi-modal Support** - Image and code understanding
- [ ] **Git Integration** - Commit message generation, diff analysis
- [ ] **Plugin System** - Extensible functionality
- [ ] **Code Review** - Automated PR reviews

## 📄 License

MIT License - see LICENSE file for details.