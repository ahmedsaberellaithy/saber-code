# Saber Code CLI

CLI for Ollama: batch context, plan, implement, and quick tasks.

## Installation

```bash
npm install
npm install -g .  # Optional: global install
```

## Prerequisites

- Node.js v14+
- Ollama running (`ollama serve`)
- At least one model: `ollama pull codellama:13b`

## Commands

```bash
# Interactive chat with streaming
saber-code chat

# Create plan (batch context, build plan, optionally execute)
saber-code plan "goal" --load "src/**/*.js" --execute

# Execute saved plan
saber-code exec

# Quick commands
saber-code search "pattern"
saber-code analyze <file>
saber-code models
```

## Project Structure

```
src/
├── core/          # Config, OllamaClient, Agent, ContextManager, PlanManager, TokenCounter
├── tools/         # read, write, edit, list, search, glob, shell + registry
├── cli/           # Commands (chat, plan, exec, quick) + UI
└── utils/         # FileUtils, logger, patterns
```

## Configuration

Create `.saber-code.json`:
```json
{
  "ollama": {
    "defaultModel": "codellama:13b",
    "baseURL": "http://localhost:11434"
  },
  "context": {
    "maxContextTokens": 8000,
    "maxConversationMessages": 50
  }
}
```

## Testing

```bash
npm test                    # All tests
npm run test:unit          # Unit only
npm run test:integration   # Integration only
npm run test:e2e           # E2E only
```

## Development

- Core components: `src/core/`
- Tools: `src/tools/` (add new tools to registry)
- CLI commands: `src/cli/commands/`
- Config: `.saber-code.json` or env vars (`OLLAMA_HOST`, `SABER_MODEL`)
