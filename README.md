# Saber Code CLI

> ⚠️ **IMPORTANT: DEVELOPMENT STATUS WARNING** ⚠️
> 
> **THIS PROJECT IS UNDER ACTIVE DEVELOPMENT AND TESTING**
> 
> **DO NOT USE IN PRODUCTION OR ON IMPORTANT CODE**
> 
> - This tool can **modify, create, and delete files** on your system
> - It is **NOT production-ready** and may contain bugs
> - AI-generated plans may be incorrect or destructive
> - **ONLY use in isolated, test, or contained environments**
> - **ALWAYS backup your work** before running any operations
> - **Review all plans carefully** before executing them
> - Use version control and commit before using this tool
> - Test in a sandbox, VM, or Docker container first
> 
> By using this tool, you accept full responsibility for any data loss or system changes.
> The authors are not responsible for any damages caused by this software.

A powerful CLI tool for Ollama that enables batch context loading, plan creation, and AI-powered code operations. Built with a clean, modular architecture inspired by Claude Code.

## Features

- **Interactive Chat** - Streaming AI conversations with project context
- **Plan Mode** - Create, review, and execute multi-step plans
- **Context Batching** - Load multiple files before planning
- **Tool-based Operations** - Consistent interface for file operations
- **Token-aware Context** - Automatic pruning to fit model limits
- **Streaming Support** - Real-time AI responses
- **100% Local** - All processing via Ollama, no API keys needed

## Installation

### Prerequisites

1. **Node.js** (v14 or higher)
   ```bash
   node --version
   ```

2. **Ollama** - Install from [ollama.ai](https://ollama.ai)
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

3. **Start Ollama Service**
   ```bash
   ollama serve  # Usually runs automatically
   ```

4. **Pull a Model**
   ```bash
   ollama pull codellama:13b
   # Or: mistral, llama2, codellama:7b
   ```

### Install Saber Code CLI

⚠️ **Before installing, read the development status warning at the top of this README!**

```bash
# Clone and install
git clone <your-repo>
cd saber-code-cli
npm install

# DO NOT install globally until thoroughly tested in isolated environment
# npm install -g .  # Only after testing

# Verify installation
saber-code --help
```

### Recommended: Test in Isolated Environment

```bash
# Option 1: Docker container
docker run -it --rm -v $(pwd):/workspace node:18 bash
cd /workspace && npm install

# Option 2: Test directory
mkdir ~/saber-test && cd ~/saber-test
git init
# Test the CLI here first

# Option 3: VM or dedicated test machine
```

## Safety Recommendations

Before using any commands:

1. **Commit your work**: `git add -A && git commit -m "Before saber-code"`
2. **Review plans carefully**: Always check the plan preview before saving/executing
3. **Use --verbose**: See exactly what will be done: `saber-code plan "goal" --verbose`
4. **Test incrementally**: Start with small, specific goals
5. **Backup important files**: Copy critical files before modifications
6. **Use continue-on-error cautiously**: Understand that errors may cascade
7. **Verify results**: Check files after execution

## Safety Recommendations

⚠️ **Before using any commands:**

1. **Commit your work**: `git add -A && git commit -m "Before saber-code"`
2. **Review plans carefully**: Always check the plan preview before saving/executing
3. **Use --verbose**: See exactly what will be done: `saber-code plan "goal" --verbose`
4. **Test incrementally**: Start with small, specific goals
5. **Backup important files**: Copy critical files before modifications
6. **Use continue-on-error cautiously**: Understand that errors may cascade
7. **Verify results**: Check files after execution
8. **Test in isolated environment**: Use a test directory or container

## Commands

### `chat` - Interactive Chat

Start an interactive session with streaming AI responses.

```bash
saber-code chat
saber-code chat --model mistral
saber-code chat --no-stream
saber-code chat --verbose  # Show API communications and timing
```

**Chat Commands:**
- `/load <pattern>` - Load files into context (e.g., `/load "src/**/*.js"`)
- `help` - Show available commands
- `context` - Show loaded files and recent changes
- `clear` - Clear context
- `quit` - Exit chat

**Example:**
```bash
$ saber-code chat
You: /load src/core/*.js
Loaded 5 file(s) into context.

You: Explain the Agent class
Assistant: The Agent class orchestrates...
```

### `plan` - Create and Execute Plans

Batch context, create a plan, and optionally execute it.

```bash
# Create plan
saber-code plan "Add error handling" --load "src/**/*.js"

# Create and execute immediately
saber-code plan "Refactor utils" --load "src/utils/**" --execute --yes

# With custom model
saber-code plan "Add tests" -m mistral -l "src/**/*.js" -e
```

**Options:**
- `-m, --model <model>` - Ollama model (default: codellama:13b)
- `-l, --load <patterns...>` - Glob patterns to load into context
- `-e, --execute` - Execute plan after creating
- `-y, --yes` - Skip confirmation when executing
- `--continue-on-error` - Continue execution on step failure
- `-v, --verbose` - Show API communications, prompts, and timing

**Output:**
```
📋 Plan Preview:
Goal: Add error handling
Steps: 5
Filename: add-error-handling-20240124-143022.json
Path: _saber_code_plans/add-error-handling-20240124-143022.json

Steps:
  1. read {"path":"src/index.js"}
  2. edit {"path":"src/index.js","oldText":"...","newText":"..."}
  ...

Full plan JSON:
────────────────────────────────────────────────────────────
{
  "goal": "Add error handling",
  "steps": [...]
}
────────────────────────────────────────────────────────────

Save this plan? (Y/n)
```

### `exec` - Execute Plans

Execute a saved plan (latest if no path provided).

```bash
# Execute latest plan
saber-code exec

# Execute specific plan
saber-code exec _saber_code_plans/add-error-handling-20240124-143022.json

# Continue on error
saber-code exec --continue-on-error
```

### `plans` - List All Plans

Show all saved plans with metadata.

```bash
saber-code plans
```

**Output:**
```
Available plans:

add-error-handling-20240124-143022.json
  Goal: Add error handling
  Steps: 5
  Created: 1/24/2024, 10:30:45 AM
  Path: _saber_code_plans/add-error-handling-20240124-143022.json
```

### `search` - Code Search

Grep-like search across files.

```bash
# Basic search
saber-code search "function"

# With glob pattern
saber-code search "TODO" --glob "src/**/*.js"

# Limit results
saber-code search "require" -n 20 --limit 10
```

**Options:**
- `-g, --glob <pattern>` - File glob (default: `**/*`)
- `-n, --max-results <n>` - Max matches (default: 50)
- `--limit <n>` - Max lines to show (default: 30)

### `analyze` - Analyze File

AI-powered file analysis.

```bash
saber-code analyze src/index.js
saber-code analyze package.json -m mistral
```

### `models` - List Ollama Models

Show available Ollama models.

```bash
saber-code models
```

## Configuration

### Config File

Create `.saber-code.json` in your project root:

```json
{
  "ollama": {
    "baseURL": "http://localhost:11434",
    "defaultModel": "codellama:13b",
    "timeout": 120000,
    "generate": {
      "temperature": 0.7,
      "top_p": 0.9,
      "num_predict": 2048
    }
  },
  "context": {
    "maxConversationMessages": 50,
    "maxRecentChanges": 20,
    "maxContextTokens": 8000,
    "knowledgeUpdateInterval": 5
  },
  "limits": {
    "maxFilesInContext": 20,
    "maxFileSearchResults": 50,
    "maxProjectStructureFiles": 100
  }
}
```

### Environment Variables

- `OLLAMA_HOST` - Override Ollama base URL
- `SABER_MODEL` - Override default model

```bash
export OLLAMA_HOST=http://localhost:11434
export SABER_MODEL=mistral
```

## Project Structure

```
saber-code-cli/
├── src/
│   ├── core/              # Core components
│   │   ├── Config.js           # Configuration management
│   │   ├── OllamaClient.js     # Ollama API client (with streaming)
│   │   ├── TokenCounter.js     # Token estimation and budgeting
│   │   ├── ContextManager.js   # Context management with pruning
│   │   ├── Agent.js            # Tool orchestration and chat
│   │   └── PlanManager.js      # Plan creation and execution
│   ├── tools/             # Tool layer
│   │   ├── read.js             # Read files
│   │   ├── write.js            # Write files
│   │   ├── edit.js             # Edit files (replace/insert)
│   │   ├── list.js             # List directories
│   │   ├── search.js           # Search files (grep-like)
│   │   ├── globTool.js         # Find files by pattern
│   │   ├── shell.js            # Execute shell commands
│   │   └── registry.js         # Tool registry with validation
│   ├── cli/               # CLI layer
│   │   ├── commands/           # Command handlers
│   │   │   ├── chat.js         # Chat command
│   │   │   ├── plan.js         # Plan command
│   │   │   ├── exec.js         # Exec command
│   │   │   ├── plans.js        # List plans
│   │   │   └── quick.js        # Quick commands (search, analyze, models)
│   │   └── ui.js               # UI components (spinner, diff, prompts)
│   └── utils/             # Utilities
│       ├── fileUtils.js         # File operations
│       ├── logger.js            # Logging
│       └── patterns.js          # Glob patterns
├── cli.js                 # CLI entry point
├── index.js               # Main exports
└── test/                  # Test suite
    ├── unit/              # Unit tests
    ├── integration/       # Integration tests
    └── e2e/               # End-to-end tests
```

## Architecture

### Data Flow

```
User Command
    ↓
CLI Layer (commands/)
    ↓
Agent (orchestration)
    ↓
┌───────────┬──────────────┬─────────────┐
│           │              │             │
Tools    OllamaClient  ContextManager  ContextManager
│           │              │
│           └──────────────┘
│              (uses context)
│
└──→ File Operations
```

### Key Components

**Agent** - Main orchestrator
- Manages conversation with Ollama
- Runs tools via registry
- Updates context after operations
- Supports streaming responses

**ContextManager** - Token-aware context
- Tracks files, messages, recent changes
- Prunes to fit token budget
- Builds context strings for prompts

**PlanManager** - Plan lifecycle
- Creates plans from goals
- Saves with random filenames
- Executes plan steps sequentially
- Handles errors gracefully

**Tool Registry** - Tool execution
- Validates tool arguments
- Executes tools with context
- Tracks write operations

## Development

### Adding a New Tool

1. Create tool file in `src/tools/`:
```javascript
const name = 'mytool';
const description = 'My tool description';
const schema = {
  arg1: { type: 'string', description: '...' }
};
async function execute(ctx, args) {
  // Implementation
  return { result: '...' };
}
module.exports = { name, description, schema, execute };
```

2. Register in `src/tools/index.js`:
```javascript
const mytool = require('./mytool');
// Add to BUILTINS array
```

### Adding a New Command

1. Create command in `src/cli/commands/`:
```javascript
async function runMyCommand(options = {}) {
  // Implementation
}
module.exports = { runMyCommand };
```

2. Add to `src/cli/index.js` exports

3. Register in `cli.js`:
```javascript
program
  .command('mycommand')
  .description('My command')
  .action(async (options) => {
    await runMyCommand(options);
  });
```

### Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**Note:** E2E tests require Ollama running with at least one model installed.

## Plan Format

Plans are saved as JSON with this structure:

```json
{
  "goal": "Add error handling",
  "steps": [
    {
      "tool": "read",
      "args": { "path": "src/index.js" }
    },
    {
      "tool": "edit",
      "args": {
        "path": "src/index.js",
        "oldText": "function main() {",
        "newText": "function main() {\n  try {"
      }
    },
    {
      "tool": "write",
      "args": {
        "path": "src/utils/errors.js",
        "content": "..."
      }
    }
  ],
  "createdAt": "2024-01-24T10:30:45.123Z"
}
```

**Available Tools:**
- `read` - Read file(s)
- `write` - Create/overwrite file
- `edit` - Replace text or insert at line
- `list` - List directory
- `search` - Search files
- `glob` - Find files by pattern
- `shell` - Run shell command

## Verbose Mode 📊

Use `--verbose` flag to see detailed API communications, timing, and context information:

```bash
saber-code chat --verbose
saber-code plan "goal" --verbose
```

**Verbose output shows:**
- 📤 API Request details (URL, model, options)
- 📥 API Response (status, duration, data preview)
- 💭 Prompt being sent (messages, token count)
- 📚 Context information (files, messages, token size)
- ⏱️ Timing for each operation
- 📊 Streaming stats (chunks, characters)

**Example verbose output:**
```
💭 Prompt to Model:
  Messages: 3
  Estimated tokens: 1250
  [1] SYSTEM: You are a helpful coding assistant...
  [2] USER: Explain the Agent class
  [3] ASSISTANT: ...

📚 Context:
  Files: 5
  Messages: 2
  Size: 1250 tokens

📤 API Request:
  POST http://localhost:11434/api/generate
  Body: {"model":"codellama:13b","prompt":"...","stream":true}

📡 Streaming started...
📊 Chunks: 10, Chars: 250
⏱️  Stream duration: 2.45s
📊 Total chunks: 45, Total chars: 1200
```

## Troubleshooting

### Ollama Connection Error

```bash
# Check Ollama is running
ollama serve

# Verify connection
curl http://localhost:11434/api/tags

# List models
ollama list
```

### Model Not Found

```bash
# Pull default model
ollama pull codellama:13b

# Try smaller model
ollama pull codellama:7b
ollama pull mistral
```

### Plan Creation Fails

- The model may return invalid JSON. The parser tries to fix common issues, but if it fails:
  - Try a different model: `saber-code plan "goal" -m mistral`
  - Make the goal more specific
  - Check the raw response in error output

### Context Too Large

- Reduce `maxContextTokens` in config
- Load fewer files: `--load "src/core/*.js"` instead of `"src/**/*.js"`
- Use a model with larger context window

### Slow Responses

- Use smaller models (codellama:7b vs codellama:13b)
- Reduce `num_predict` in config
- Check Ollama is using GPU: `ollama show codellama:13b`

## Storage

**Plans** are stored in `_saber_code_plans/` directory (project root):
- Filename format: `{goal-name}-{YYYYMMDD}-{HHMMSS}.json`
- Example: `add-error-handling-20240124-143022.json`
- Plans are shown as preview before saving (you can review and choose to save or not)

**History** is stored in `.saber-chat-history/`:
- `chat_history.json` - Conversation history
- `intro_to_project.md` - Project knowledge base

## License

MIT

## Author

Ahmed Saber
