# Saber Code CLI - Project Flow & Architecture

This document provides comprehensive visual diagrams of the project architecture, data flow, and testing strategy.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [CLI Command Flow](#cli-command-flow)
3. [Tool Execution Flow](#tool-execution-flow)
4. [Plan Workflow](#plan-workflow)
5. [Context Management](#context-management)
6. [Testing Architecture](#testing-architecture)

---

## System Architecture

```mermaid
graph TB
    subgraph "User Interface Layer"
        CLI[CLI Entry Point<br/>cli.js]
        CMD[Commander.js<br/>Command Parser]
    end
    
    subgraph "Command Layer"
        CHAT[Chat Command<br/>Interactive AI]
        PLAN[Plan Command<br/>Create Plans]
        EXEC[Exec Command<br/>Execute Plans]
        QUICK[Quick Commands<br/>Search/Analyze/Models]
        PLANS[Plans Command<br/>List/Load Plans]
    end
    
    subgraph "Core Layer"
        AGENT[Agent<br/>Tool Orchestration]
        PLAN_MGR[PlanManager<br/>Plan CRUD]
        CTX_MGR[ContextManager<br/>File & Message Context]
        OLLAMA[OllamaClient<br/>API Communication]
        CONFIG[Config<br/>Settings Management]
    end
    
    subgraph "Tools Layer"
        REGISTRY[ToolRegistry<br/>Schema Validation]
        READ[read]
        WRITE[write]
        EDIT[edit]
        LIST[list]
        SEARCH[search]
        GLOB[glob]
        SHELL[shell]
    end
    
    subgraph "Utils Layer"
        FILE_UTILS[FileUtils<br/>File Operations]
        TOKEN_CTR[TokenCounter<br/>Token Budgeting]
        LOGGER[Logger<br/>Debug Output]
        PATTERNS[Patterns<br/>Ignore Rules]
    end
    
    subgraph "Features Layer"
        ANALYZER[CodeAnalyzer<br/>Code Analysis]
    end
    
    subgraph "External"
        OLLAMA_API[Ollama API<br/>localhost:11434]
        FS[File System]
    end
    
    CLI --> CMD
    CMD --> CHAT
    CMD --> PLAN
    CMD --> EXEC
    CMD --> QUICK
    CMD --> PLANS
    
    CHAT --> AGENT
    PLAN --> PLAN_MGR
    EXEC --> PLAN_MGR
    QUICK --> AGENT
    PLANS --> PLAN_MGR
    
    AGENT --> CTX_MGR
    AGENT --> OLLAMA
    AGENT --> REGISTRY
    PLAN_MGR --> AGENT
    PLAN_MGR --> OLLAMA
    
    CTX_MGR --> TOKEN_CTR
    CTX_MGR --> FILE_UTILS
    OLLAMA --> OLLAMA_API
    
    REGISTRY --> READ
    REGISTRY --> WRITE
    REGISTRY --> EDIT
    REGISTRY --> LIST
    REGISTRY --> SEARCH
    REGISTRY --> GLOB
    REGISTRY --> SHELL
    
    READ --> FILE_UTILS
    WRITE --> FILE_UTILS
    EDIT --> FILE_UTILS
    LIST --> FILE_UTILS
    SEARCH --> FILE_UTILS
    GLOB --> FILE_UTILS
    SHELL --> FS
    
    FILE_UTILS --> FS
    FILE_UTILS --> PATTERNS
    
    AGENT --> CONFIG
    PLAN_MGR --> CONFIG
    OLLAMA --> CONFIG
    
    QUICK --> ANALYZER
    ANALYZER --> FILE_UTILS
    
    CONFIG -.-> LOGGER
```

---

## CLI Command Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Commander
    participant Command
    participant Core
    participant Ollama
    participant FS as File System
    
    User->>CLI: saber-code <command>
    CLI->>Commander: Parse arguments
    Commander->>Command: Route to handler
    
    alt Chat Command
        Command->>Core: Initialize Agent
        Core->>Ollama: Stream chat
        Ollama-->>Command: AI Response
        Command-->>User: Display output
    
    else Plan Command
        Command->>Core: Create plan (PlanManager)
        Core->>Ollama: Request plan structure
        Ollama-->>Core: JSON plan
        Core->>FS: Save to _saber_code_plans/
        FS-->>Command: Plan saved
        Command-->>User: Show plan + path
    
    else Exec Command
        Command->>Core: Load plan (PlanManager)
        Core->>FS: Read plan file
        loop For each step
            Core->>Core: Execute tool via Agent
            Core->>FS: Perform file operation
        end
        Core-->>Command: Execution results
        Command-->>User: Show results
    
    else Search/Analyze
        Command->>Core: Quick operation
        Core->>FS: Read files
        alt Analyze
            Core->>Ollama: AI analysis
            Ollama-->>Core: Analysis
        end
        Core-->>Command: Results
        Command-->>User: Display
    
    else Models
        Command->>Ollama: List models
        Ollama-->>Command: Available models
        Command-->>User: Display models
    end
```

---

## Tool Execution Flow

```mermaid
flowchart TD
    START([Tool Execution Request]) --> VALIDATE{Validate<br/>Tool Name}
    
    VALIDATE -->|Invalid| ERROR1[Throw Error:<br/>Unknown tool]
    VALIDATE -->|Valid| GET_SCHEMA[Get Tool Schema]
    
    GET_SCHEMA --> VALIDATE_ARGS{Validate<br/>Arguments}
    VALIDATE_ARGS -->|Invalid| ERROR2[Throw Error:<br/>Invalid args]
    VALIDATE_ARGS -->|Valid| PREPARE[Prepare Context]
    
    PREPARE --> CTX{Context Type}
    
    CTX -->|File Op| FILE_CTX[Create FileUtils<br/>rootPath]
    CTX -->|Other| BASE_CTX[Create Base Context]
    
    FILE_CTX --> EXECUTE
    BASE_CTX --> EXECUTE
    
    EXECUTE[Execute Tool] --> TOOL_TYPE{Tool Type}
    
    TOOL_TYPE -->|read| READ_OP[Read File]
    TOOL_TYPE -->|write| WRITE_OP[Write File]
    TOOL_TYPE -->|edit| EDIT_OP[Edit File<br/>find/replace]
    TOOL_TYPE -->|list| LIST_OP[List Directory]
    TOOL_TYPE -->|search| SEARCH_OP[Grep Search]
    TOOL_TYPE -->|glob| GLOB_OP[Pattern Match]
    TOOL_TYPE -->|shell| SHELL_OP[Execute Command]
    
    READ_OP --> RESULT
    WRITE_OP --> RESULT
    EDIT_OP --> RESULT
    LIST_OP --> RESULT
    SEARCH_OP --> RESULT
    GLOB_OP --> RESULT
    SHELL_OP --> RESULT
    
    RESULT[Tool Result] --> LOG{Verbose<br/>Mode?}
    LOG -->|Yes| LOG_OUT[Log to console]
    LOG -->|No| RETURN
    LOG_OUT --> RETURN
    
    RETURN([Return Result])
    
    ERROR1 --> END([End with Error])
    ERROR2 --> END
```

---

## Plan Workflow

```mermaid
stateDiagram-v2
    [*] --> PlanRequest: User requests plan
    
    PlanRequest --> BuildPrompt: Build context + goal
    BuildPrompt --> CallOllama: Send to AI
    CallOllama --> ParseJSON: Receive response
    
    ParseJSON --> ValidatePlan: Extract JSON
    ValidatePlan --> GenerateFilename: Valid plan
    ParseJSON --> ErrorInvalidJSON: Invalid JSON
    
    GenerateFilename --> SaveToDisk: Random name + timestamp
    SaveToDisk --> DisplayPlan: Save to _saber_code_plans/
    DisplayPlan --> [*]: Show plan to user
    
    ErrorInvalidJSON --> [*]: Show error
    
    state ExecutionFlow {
        [*] --> LoadPlan: User executes plan
        LoadPlan --> ValidateSteps: Read from disk
        ValidateSteps --> ExecuteStep1: Valid
        ValidateSteps --> ErrorNoSteps: Invalid
        
        ExecuteStep1 --> CheckResult1: Run tool
        CheckResult1 --> ExecuteStep2: Success
        CheckResult1 --> HandleError1: Failure
        
        HandleError1 --> ContinueOnError: continueOnError?
        ContinueOnError --> ExecuteStep2: Yes
        ContinueOnError --> ReportFailure: No
        
        ExecuteStep2 --> CheckResult2: Run tool
        CheckResult2 --> ExecuteStepN: Success
        CheckResult2 --> HandleError2: Failure
        
        HandleError2 --> ContinueOnError2: continueOnError?
        ContinueOnError2 --> ExecuteStepN: Yes
        ContinueOnError2 --> ReportFailure: No
        
        ExecuteStepN --> AllComplete: All steps done
        AllComplete --> [*]: Return results
        
        ReportFailure --> [*]: Return partial results
        ErrorNoSteps --> [*]: Error
    }
```

---

## Context Management

```mermaid
flowchart LR
    subgraph "Context Sources"
        FILES[File Content]
        MSGS[Chat Messages]
        CHANGES[Recent Changes]
    end
    
    subgraph "Context Manager"
        ADD[Add to Context]
        COUNT[Count Tokens]
        PRUNE[Prune if Needed]
        FORMAT[Format Output]
    end
    
    subgraph "Token Counter"
        ESTIMATE[Estimate Tokens<br/>chars / 4]
        CHECK[Check Budget]
        TRUNCATE[Truncate if Over]
    end
    
    subgraph "Agent"
        BUILD[Build Prompt]
        SEND[Send to Ollama]
        PROCESS[Process Response]
    end
    
    FILES --> ADD
    MSGS --> ADD
    CHANGES --> ADD
    
    ADD --> COUNT
    COUNT --> ESTIMATE
    ESTIMATE --> CHECK
    CHECK -->|Over Budget| PRUNE
    CHECK -->|Under Budget| FORMAT
    PRUNE --> TRUNCATE
    TRUNCATE --> FORMAT
    
    FORMAT --> BUILD
    BUILD --> SEND
    SEND --> PROCESS
    
    PROCESS -->|Add to History| MSGS
    PROCESS -->|Update Changes| CHANGES
```

---

## Testing Architecture

```mermaid
graph TB
    subgraph "Test Levels"
        COMPONENT[Component Tests<br/>10 tests<br/>Integration verification]
        UNIT[Unit Tests<br/>147 tests<br/>Individual functions]
        E2E[E2E Tests<br/>10 tests<br/>Full workflows]
        TDD[TDD Tests<br/>13 tests<br/>Business scenarios]
    end
    
    subgraph "Unit Test Coverage"
        U_CONFIG[Config: 5]
        U_TOKEN[TokenCounter: 8]
        U_OLLAMA[OllamaClient: 12]
        U_CTX[ContextManager: 15]
        U_AGENT[Agent: 10]
        U_PLAN[PlanManager: 11]
        U_TOOLS[Tools: 35]
        U_FILE[FileUtils: 18]
        U_PATTERN[Patterns: 8]
        U_ANALYZER[CodeAnalyzer: 12]
        U_LOGGER[Logger: 8]
        U_PATH[PathResolution: 5]
    end
    
    subgraph "E2E Test Coverage"
        E_SEARCH[Search Command]
        E_ANALYZE[Analyze Command]
        E_MODELS[Models Command]
        E_CONTEXT[Context Management]
        E_TOOLS[Tool Execution]
        E_WORKFLOW[Real Workflows]
    end
    
    subgraph "TDD Business Scenarios"
        T_ONBOARD[Developer Onboarding]
        T_BUG[Bug Fixing]
        T_FEATURE[Feature Development]
        T_REFACTOR[Code Refactoring]
        T_DOCS[Documentation]
        T_TEST[Testing]
        T_ERROR[Error Recovery]
        T_CTX[Context Management]
    end
    
    subgraph "Test Execution"
        NPM_TEST[npm test<br/>Component + Unit]
        NPM_E2E[npm run test:e2e<br/>E2E tests]
        NPM_TDD[npm run test:tdd<br/>Business tests]
        NPM_ALL[npm run test:all<br/>All tests]
    end
    
    UNIT --> U_CONFIG
    UNIT --> U_TOKEN
    UNIT --> U_OLLAMA
    UNIT --> U_CTX
    UNIT --> U_AGENT
    UNIT --> U_PLAN
    UNIT --> U_TOOLS
    UNIT --> U_FILE
    UNIT --> U_PATTERN
    UNIT --> U_ANALYZER
    UNIT --> U_LOGGER
    UNIT --> U_PATH
    
    E2E --> E_SEARCH
    E2E --> E_ANALYZE
    E2E --> E_MODELS
    E2E --> E_CONTEXT
    E2E --> E_TOOLS
    E2E --> E_WORKFLOW
    
    TDD --> T_ONBOARD
    TDD --> T_BUG
    TDD --> T_FEATURE
    TDD --> T_REFACTOR
    TDD --> T_DOCS
    TDD --> T_TEST
    TDD --> T_ERROR
    TDD --> T_CTX
    
    COMPONENT --> NPM_TEST
    UNIT --> NPM_TEST
    E2E --> NPM_E2E
    TDD --> NPM_TDD
    
    NPM_TEST --> NPM_ALL
    NPM_E2E --> NPM_ALL
    NPM_TDD --> NPM_ALL
```

---

## Test Flow Diagram

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Jest
    participant Component as Component Test
    participant Unit as Unit Test
    participant E2E as E2E Test
    participant Mock as Mock Ollama
    participant FS as File System
    
    Dev->>Jest: npm test
    
    rect rgb(200, 220, 240)
    Note over Jest,Component: Component Tests (10)
    Jest->>Component: Run test-components.js
    Component->>Component: Test Config loading
    Component->>Component: Test TokenCounter
    Component->>Component: Test OllamaClient
    Component->>Component: Test ContextManager
    Component->>Component: Test Tools Registry
    Component->>Component: Test Agent
    Component->>Component: Test PlanManager
    Component->>Component: Test CLI Commands
    Component->>Component: Test UI Components
    Component->>Component: Test File Operations
    Component-->>Jest: ✅ 10/10 passed
    end
    
    rect rgb(220, 240, 200)
    Note over Jest,Unit: Unit Tests (147)
    Jest->>Unit: Run jest unit tests
    Unit->>Mock: Mock API calls
    Unit->>FS: Mock file operations
    Unit->>Unit: Test all functions
    Unit-->>Jest: ✅ 147/147 passed
    end
    
    rect rgb(240, 220, 200)
    Note over Jest,E2E: E2E Tests (10)
    Jest->>E2E: Run jest e2e tests
    E2E->>Mock: Mock Ollama API
    E2E->>FS: Real file operations (temp dir)
    E2E->>E2E: Test full workflows
    E2E-->>Jest: ✅ 10/10 passed
    end
    
    Jest-->>Dev: ✅ All 167 tests passed!
```

---

## Areas Tested

### ✅ Core Functionality (100% Coverage)
- **Configuration Management**: Environment variables, file loading, defaults
- **Token Management**: Counting, budgeting, truncation
- **API Communication**: Request/response, streaming, error handling
- **Context Management**: File tracking, message history, pruning
- **Agent Orchestration**: Tool execution, conversation loop
- **Plan Management**: Create, validate, save, load, execute

### ✅ Tool Operations (100% Coverage)
- **read**: Read file contents
- **write**: Create/overwrite files
- **edit**: Find and replace in files
- **list**: Directory listing
- **search**: Grep-like search
- **glob**: Pattern matching
- **shell**: Command execution

### ✅ CLI Commands (100% Coverage)
- **chat**: Interactive AI conversation
- **plan**: Create execution plans
- **exec**: Execute saved plans
- **search**: Search codebase
- **analyze**: AI code analysis
- **models**: List available models
- **plans**: List/load saved plans

### ✅ Utilities (100% Coverage)
- **FileUtils**: File operations, path resolution
- **Logger**: Debug output, verbose mode
- **Patterns**: Ignore rules, file filtering
- **CodeAnalyzer**: Code analysis and statistics

### ✅ Business Scenarios (100% Coverage)
- Developer onboarding workflow
- Bug fixing with AI assistance
- Feature development planning
- Code refactoring strategies
- Documentation generation
- Test creation
- Error recovery
- Context-aware suggestions

---

## Test Execution Matrix

| Test Type | Count | Speed | Purpose | When to Run |
|-----------|-------|-------|---------|-------------|
| Component | 10 | Very Fast (1s) | Integration check | Always |
| Unit | 147 | Fast (2s) | Function verification | Always |
| E2E | 10 | Medium (3s) | Workflow validation | Pre-commit |
| TDD | 13 | Medium (5s) | Business logic | Optional |
| **Total** | **180** | **~10s** | **Full coverage** | **npm run test:all** |

---

## Quality Metrics

```
Component Tests:    10/10   (100%) ✅
Unit Tests:        147/147  (100%) ✅
E2E Tests:          10/10   (100%) ✅
TDD Tests:          13/13   (100%) ✅
────────────────────────────────────
TOTAL:             180/180  (100%) ✅

Code Coverage:     ~95%     ✅
Documentation:     Complete ✅
ADRs:              6 docs   ✅
Guides:            3 docs   ✅
```

---

## Next Steps

For detailed information, see:
- [ADR Index](../adr/README.md) - Architecture decisions
- [Testing Guides](../guides/README.md) - How to test
- [Model Research](../research/MODEL_COMPARISON.md) - AI model selection

**Quick Start**: `npm test` → All core tests passing in ~3 seconds! 🚀
