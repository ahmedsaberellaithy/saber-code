# Saber Code CLI

> AI-powered code assistant with local privacy - Your personal coding companion powered by Ollama

[![Tests](https://img.shields.io/badge/tests-180%2F180-brightgreen)](./docs/adr/006-test-status.md)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)](./docs/adr/006-test-status.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D14-brightgreen)](https://nodejs.org)

A powerful CLI tool that brings AI-assisted coding to your terminal with **complete privacy** using local Ollama models. No cloud dependencies, no data sharing—just pure local AI power.

---

## ✨ Features

- 🤖 **Interactive AI Chat** - Natural conversation with your codebase
- 📋 **Plan-Then-Execute** - Create multi-step plans before implementation
- 🔍 **Code Search & Analysis** - Grep-like search with AI-powered insights
- 📝 **Smart File Operations** - Read, write, edit files with AI assistance
- 🎯 **Context-Aware** - Automatic context management with token budgeting
- 🔒 **100% Private** - All processing happens locally via Ollama
- ⚡ **Fast & Efficient** - Streaming responses, optimized token usage
- 🛠️ **7 Built-in Tools** - read, write, edit, list, search, glob, shell
- 📊 **Model Flexibility** - Works with any Ollama model
- 🧪 **Fully Tested** - 180 tests with 100% pass rate

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js** v14 or higher
2. **Ollama** running on your system
3. **AI Model** downloaded (recommended: `qwen2.5-coder:32b-instruct`)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/saber-code-cli.git
cd saber-code-cli

# Install dependencies
npm install

# Link CLI globally
npm link

# Setup environment
cp .env.example .env

# Pull recommended AI model
ollama pull qwen2.5-coder:32b-instruct

# Verify installation
npm test
```

### First Command

```bash
# Start an interactive chat
saber-code chat "Explain this codebase"

# Create a plan
saber-code plan "Add user authentication"

# Execute the plan
saber-code exec

# Search your code
saber-code search "function.*User"

# Analyze a file
saber-code analyze src/index.js
```

---

## 📖 Documentation

All documentation is organized in the [`docs/`](./docs/) directory following ADR (Architecture Decision Records) principles.

### 📚 Core Documentation

| Document | Purpose | Duration |
|----------|---------|----------|
| **[Quick Start Guide](./docs/guides/QUICK_START_TESTING.md)** | Fast setup & verification | 20 min |
| **[Project Flow](./docs/PROJECT_FLOW.md)** | Architecture diagrams | 10 min |
| **[ADR Index](./docs/adr/README.md)** | All architecture decisions | Reference |
| **[Testing Guide](./docs/guides/TESTING_GUIDE.md)** | Manual testing | 1 hour |
| **[Zero to Hero](./docs/guides/ZERO_TO_HERO.md)** | Complete validation | 2 hours |
| **[Model Comparison](./docs/research/MODEL_COMPARISON.md)** | AI model research | Reference |

### 🗂️ Documentation Structure

```
docs/
├── README.md                    # Documentation index
├── PROJECT_FLOW.md              # System architecture & flow diagrams
├── adr/                         # Architecture Decision Records
│   ├── 001-implementation-summary.md
│   ├── 002-test-cleanup.md
│   ├── 003-project-status.md
│   ├── 004-setup-complete.md
│   ├── 005-status.md
│   └── 006-test-status.md
├── guides/                      # Testing & usage guides
│   ├── QUICK_START_TESTING.md
│   ├── TESTING_GUIDE.md
│   └── ZERO_TO_HERO.md
└── research/                    # Research & analysis
    └── MODEL_COMPARISON.md
```

---

## 🎯 Usage

### Interactive Chat

```bash
# Start a conversation
saber-code chat "How does the authentication work?"

# Chat with specific files in context
saber-code chat "Refactor this function" --files src/auth.js

# Use a specific model
saber-code chat "Optimize this code" --model codellama:13b
```

### Plan & Execute Workflow

```bash
# Create a plan for a task
saber-code plan "Add logging to all API endpoints"
# → Saves to _saber_code_plans/plan-<timestamp>.json

# Review the plan
cat _saber_code_plans/plan-<timestamp>.json

# Execute the plan
saber-code exec
# → Executes latest plan

# Execute specific plan
saber-code exec _saber_code_plans/plan-<timestamp>.json

# List all plans
saber-code plans
```

### Quick Commands

```bash
# Search codebase
saber-code search "TODO|FIXME"

# Analyze a file with AI
saber-code analyze src/complex-function.js

# List available models
saber-code models

# Get help
saber-code --help
saber-code chat --help
```

---

## 🏗️ Architecture

Saber Code CLI follows a clean, modular architecture:

```
┌─────────────────┐
│   CLI Layer     │  Commander.js → Parse & Route
└────────┬────────┘
         │
┌────────▼────────┐
│ Command Layer   │  chat, plan, exec, search, analyze
└────────┬────────┘
         │
┌────────▼────────┐
│   Core Layer    │  Agent, PlanManager, ContextManager
└────────┬────────┘
         │
┌────────▼────────┐
│  Tools Layer    │  read, write, edit, list, search, glob, shell
└────────┬────────┘
         │
┌────────▼────────┐
│  Utils Layer    │  FileUtils, TokenCounter, Logger
└─────────────────┘
```

**For detailed architecture diagrams**, see [docs/PROJECT_FLOW.md](./docs/PROJECT_FLOW.md)

---

## 🧪 Testing

### Automated Tests

```bash
# Quick test (Component + Unit) - 2 seconds
npm test

# All tests - 10 seconds
npm run test:all

# Specific test suites
npm run test:unit        # Unit tests only
npm run test:e2e         # E2E tests only
npm run test:component   # Component tests only
npm run test:coverage    # With coverage report
```

### Manual Testing

For AI-dependent features, follow our testing guides:
- **[Quick Start](./docs/guides/QUICK_START_TESTING.md)**
- **[Testing Guide](./docs/guides/TESTING_GUIDE.md)**
- **[Zero to Hero](./docs/guides/ZERO_TO_HERO.md)**

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file (see [.env.example](./.env.example)):

```bash
# AI Model (see docs/research/MODEL_COMPARISON.md for options)
SABER_CODE_MODEL=qwen2.5-coder:32b-instruct

# Ollama Server
SABER_CODE_BASE_URL=http://localhost:11434

# API Timeout (milliseconds)
SABER_CODE_TIMEOUT=120000

# Context Settings
SABER_CODE_MAX_TOKENS=32000
SABER_CODE_MAX_FILES=20
SABER_CODE_MAX_CONVERSATION=50

# Verbose Mode (1 to enable debug logging)
DEBUG=0
```

### Configuration File

Create `.saber-code.json` in your project:

```json
{
  "ollama": {
    "baseURL": "http://localhost:11434",
    "defaultModel": "qwen2.5-coder:32b-instruct",
    "timeout": 120000
  },
  "context": {
    "maxTokens": 32000,
    "maxFiles": 20,
    "maxConversation": 50
  }
}
```

---

## 🤖 Recommended Models

Based on extensive research ([details here](./docs/research/MODEL_COMPARISON.md)):

### Best Overall: Qwen2.5-Coder 32B
```bash
ollama pull qwen2.5-coder:32b-instruct
```
**Why**: Best code generation, multi-language support, good performance

### For Lower RAM (8-16GB):
```bash
ollama pull qwen2.5-coder:7b-instruct
```

### Alternative Options:
```bash
ollama pull deepseek-coder-v2:16b    # Strong reasoning
ollama pull codellama:13b             # Good balance
ollama pull mistral:7b                # Lightweight
```

**See full comparison**: [docs/research/MODEL_COMPARISON.md](./docs/research/MODEL_COMPARISON.md)

---

## 📂 Project Structure

```
saber-code-cli/
├── cli.js                   # CLI entry point
├── src/
│   ├── cli/                 # Command implementations
│   │   ├── commands/        # chat, plan, exec, quick, plans
│   │   ├── index.js         # CLI setup
│   │   └── ui.js            # UI components
│   ├── core/                # Core business logic
│   │   ├── Agent.js         # Tool orchestration
│   │   ├── Config.js        # Configuration management
│   │   ├── ContextManager.js # Context & token management
│   │   ├── OllamaClient.js  # API client
│   │   ├── PlanManager.js   # Plan CRUD & execution
│   │   └── TokenCounter.js  # Token budgeting
│   ├── tools/               # Tool implementations
│   │   ├── read.js          # Read files
│   │   ├── write.js         # Write files
│   │   ├── edit.js          # Edit files
│   │   ├── list.js          # List directories
│   │   ├── search.js        # Search code
│   │   ├── globTool.js      # Pattern matching
│   │   ├── shell.js         # Execute commands
│   │   └── registry.js      # Tool registry
│   ├── utils/               # Utilities
│   │   ├── fileUtils.js     # File operations
│   │   ├── logger.js        # Logging
│   │   └── patterns.js      # Ignore patterns
│   └── features/            # Additional features
│       └── codeAnalyzer.js  # Code analysis
├── test/                    # Test suite
│   ├── unit/                # Unit tests (147)
│   ├── e2e/                 # E2E tests (10)
│   ├── tdd/                 # TDD tests (13)
│   └── archived/            # Deprecated tests
├── docs/                    # Documentation
│   ├── adr/                 # Architecture decisions
│   ├── guides/              # Testing guides
│   └── research/            # Research docs
├── .env.example             # Environment template
├── package.json             # Dependencies
└── README.md                # This file
```

---

## 🔧 Development

### Setup Development Environment

```bash
# Clone repo
git clone https://github.com/ahmedsaberellaithy/saber-code.git
cd saber-code

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Running Locally

```bash
# Without installing globally
node cli.js chat "test message"

# Or link globally
npm link
saber-code chat "test message"
```

### Publishing

Before publishing to npm:

```bash
# Test package installation
npm run test:package

# Check package contents
npm run package:check

# Publish (runs tests automatically)
npm publish
```

**See**: [Publishing Guide](./docs/PUBLISHING.md) for complete details

### Architecture Decisions

All major decisions are documented as ADRs in [`docs/adr/`](./docs/adr/):
- [ADR-001: Implementation Summary](./docs/adr/001-implementation-summary.md)
- [ADR-002: Test Cleanup](./docs/adr/002-test-cleanup.md)
- [ADR-003: Project Status](./docs/adr/003-project-status.md)
- [ADR-004: Setup Complete](./docs/adr/004-setup-complete.md)
- [ADR-005: Status Summary](./docs/adr/005-status.md)
- [ADR-006: Test Status](./docs/adr/006-test-status.md)

---

## 🎨 Features in Detail

### 1. Interactive Chat
Natural language conversation with your codebase. The AI maintains context and can help with:
- Code explanation
- Refactoring suggestions
- Bug fixing
- Documentation generation
- Architecture discussions

### 2. Plan-Then-Execute
Create detailed, AI-generated plans before making changes:
1. **Plan**: AI creates structured steps
2. **Review**: Inspect plan before execution
3. **Execute**: Run plan automatically or step-by-step
4. **Track**: See results of each step

### 3. Code Search
Powerful grep-like search with pattern matching:
- Regex support
- Multi-file search
- Respects `.gitignore`
- Fast glob patterns

### 4. Code Analysis
AI-powered code analysis:
- Complexity analysis
- Code quality suggestions
- Security checks
- Performance recommendations

### 5. Context Management
Intelligent context handling:
- Token-aware pruning
- Automatic file selection
- Conversation history
- Recent changes tracking

### 6. File Operations
Built-in tools for file manipulation:
- **read**: Read file contents
- **write**: Create/overwrite files
- **edit**: Find and replace
- **list**: Directory listing
- **glob**: Pattern matching

### 7. Privacy First
Everything runs locally:
- No cloud APIs
- No data sharing
- No telemetry
- Complete control

---

## 🐛 Troubleshooting

### Ollama Not Running

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

### Model Not Found

```bash
# List available models
ollama list

# Pull the recommended model
ollama pull qwen2.5-coder:32b-instruct
```

### Command Not Found

```bash
# Link the CLI globally
npm link

# Or use npx
npx saber-code chat "test"
```

### Tests Failing

```bash
# Run with verbose output
npm test -- --verbose

# Check specific test
npx jest test/unit/config.test.js

# Component test
node test-components.js
```

---

## 📈 Performance

- **Startup**: < 500ms
- **Test Suite**: ~10 seconds (180 tests)
- **Chat Response**: 1-3 seconds (depends on model & hardware)
- **File Operations**: < 100ms
- **Memory Usage**: ~50MB base + model memory

**Hardware Requirements**:
- **CPU**: Any modern CPU
- **RAM**: 8GB minimum (16GB+ recommended for 32B models)
- **Disk**: 20GB for 32B model, 5GB for 7B model
- **OS**: macOS, Linux, Windows (with Ollama)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Read the [ADRs](./docs/adr/README.md) to understand architecture
2. Check [PROJECT_FLOW.md](./docs/PROJECT_FLOW.md) for system design
3. Write tests for new features
4. Update documentation
5. Follow existing code style

### Adding New Features

1. Create ADR in `docs/adr/`
2. Implement feature with tests
3. Update README and relevant guides
4. Submit PR with documentation

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

---

## 🙏 Acknowledgments

- **Ollama** - Local AI runtime
- **Qwen Team** - Excellent code models
- **Claude Code** - Inspiration for the architecture
- **Open Source Community** - Various dependencies and tools

---

## 🔗 Links

- **Repository**: [GitHub](https://github.com/yourusername/saber-code-cli)
- **Issues**: [Bug Reports](https://github.com/yourusername/saber-code-cli/issues)
- **Ollama**: [ollama.ai](https://ollama.ai)
- **Qwen2.5-Coder**: [HuggingFace](https://huggingface.co/Qwen)

---

## 📊 Project Status

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Tests**: ✅ 180/180 passing (100%)  
**Documentation**: ✅ Complete  
**Last Updated**: January 2026

---

## 🚀 Next Steps

1. **Install**: `npm install && npm link`
2. **Setup**: `cp .env.example .env`
3. **Model**: `ollama pull qwen2.5-coder:32b-instruct`
4. **Test**: `npm test`
5. **Try**: `saber-code chat "Hello!"`
6. **Learn**: Read [docs/guides/QUICK_START_TESTING.md](./docs/guides/QUICK_START_TESTING.md)

---

**Built with ❤️ by Ahmed Saber**  
*Bringing AI-powered coding to the terminal, privately.*
