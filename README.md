# 🚀 Saber Code CLI

> **Your AI-powered coding companion that keeps your data private**

Saber is a intelligent command-line interface that uses local Ollama models to help you with code analysis, editing, and project management—all while keeping your code completely private on your machine.

![CLI Demo](https://img.shields.io/badge/CLI-AI%20Assistant-blue)
![Data Privacy](https://img.shields.io/badge/Data-100%25%20Private-green)
![Ollama Powered](https://img.shields.io/badge/Powered%20By-Ollama-orange)

## ✨ Features

- **🤖 AI-Powered Code Assistance** - Get intelligent code suggestions and analysis
- **🔒 Complete Data Privacy** - Everything runs locally using Ollama models
- **📁 Project Context Awareness** - Understands your project structure and history
- **✏️ Intelligent Code Editing** - Make changes using natural language
- **📚 Persistent Knowledge Base** - Remembers your project across sessions
- **🔍 Code Search & Analysis** - Find patterns and analyze codebases
- **💬 Interactive Chat Interface** - Natural conversations about your code
- **🔄 History & Context** - Maintains conversation history and project learning

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
   # or
   ollama pull llama2
   ollama pull mistral
   ```

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd saber-code-cli

# Install dependencies
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

## 📖 Detailed Usage

### Interactive Chat Mode

Start a contextual coding session that remembers your project:

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

### Project Analysis

```bash
# Comprehensive project overview
saber-code summary

# Analyze specific files
saber-code analyze package.json
saber-code analyze src/components/Button.js

# Load multiple files for context
saber-code load "src/**/*.js" "package.json"
```

### Code Editing

Make intelligent code changes using natural language:

```bash
# Create new files
saber-code edit "Create a utility function for date formatting in src/utils/date.js"

# Modify existing code
saber-code edit "Add error handling to the fetchData function"

# Refactor code
saber-code edit "Refactor the User class to use TypeScript"

# Fix issues
saber-code edit "Fix the memory leak in the data processing function"
```

### Knowledge Management

the Project builds a knowledge base about your project:

```bash
# View project knowledge
saber-code knowledge

# Update knowledge base
saber-code knowledge --update

# View chat history
saber-code history
```

## 🛠️ Advanced Usage

### Available Models

List and use different Ollama models:

```bash
# List available models
saber-code models

# Use specific model
saber-code chat --model mistral
saber-code edit --model llama2 "Your edit description"
```

### Configuration

saber-code automatically creates a `.saber-chat-history` directory in your project with:
- `chat_history.json` - Conversation history
- `intro_to_project.md` - Project knowledge base

### Environment Variables

```bash
# Custom Ollama endpoint (if not default)
export OLLAMA_HOST=http://localhost:11434

# Default model
export SABER_DEFAULT_MODEL=codellama:13b
```

## 🏗️ Project Structure

```
saber-code-cli/
├── src/
│   ├── ollamaInterface.js    # Main AI interface
│   ├── ollamaClient.js       # Ollama API client
│   ├── orojectContext.js     # Project context management
│   ├── codeAnalyzer.js       # Code analysis utilities
│   └── fileEditor.js         # File operations
├── test/
│   └── test.js       # Test suite
├── cli.js                    # Command-line interface
├── index.js                  # Main exports
└── package.json
```

## 🧪 Testing

```bash
# Run comprehensive tests
npm test

# Quick smoke test
npm run test:basic

# Check Ollama connection
npm run test:ollama

# Run all tests
npm run test:all
```

## 🔧 Development

### Adding New Features

1. **New CLI Commands**: Add to `cli.js`
2. **AI Capabilities**: Extend `ollamaInterface.js`
3. **Project Analysis**: Enhance `projectContext.js`
4. **File Operations**: Update `fileEditor.js`

### Example: Adding a New Command

```javascript
// In cli.js
program
  .command('document <file>')
  .description('Generate documentation for a file')
  .action(wrapCommand(async (file) => {
    const response = await claude.generateDocumentation(file);
    console.log(response);
  }));
```

## 📋 Todo & Roadmap

- [ ] **Streaming Responses** - Real-time AI responses
- [ ] **Multi-modal Support** - Image and code understanding
- [ ] **Plugin System** - Extensible functionality
- [ ] **Git Integration** - Commit message generation, diff analysis
- [ ] **Code Review** - Automated PR reviews
- [ ] **Testing Integration** - Test generation and analysis
- [ ] **Deployment Helpers** - Docker, cloud deployment scripts

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


## 🙏 Acknowledgments

- **Ollama** - For making local AI models accessible
- **Anthropic** - For the Claude API interface inspiration
