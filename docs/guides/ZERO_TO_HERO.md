# 🚀 Zero to Hero - Complete Testing Checklist

This checklist takes you from a fresh setup to full confidence in the Saber Code CLI. Check each box as you complete it.

## Phase 1: Environment Setup ⚙️

### Prerequisites
- [ ] Node.js installed (v14+): `node --version`
- [ ] Ollama installed: `ollama --version`
- [ ] Git repository initialized
- [ ] Project dependencies installed: `npm install`

### Ollama Setup
- [ ] Start Ollama server: `ollama serve`
- [ ] Verify Ollama is running: `curl http://localhost:11434/api/tags`
- [ ] Pull required models:
  - [ ] `ollama pull codellama:13b` (default)
  - [ ] `ollama pull mistral` (recommended for better plan quality)
- [ ] Verify models: `ollama list`

### Project Setup
- [ ] Clone/navigate to project directory
- [ ] Install dependencies: `npm install`
- [ ] Verify CLI is accessible: `node cli.js --help`
- [ ] Create initial commit: `git add -A && git commit -m "Initial setup"`

---

## Phase 2: Component Testing 🧪

### Automated Unit Tests
- [ ] Run all unit tests: `npm run test:unit`
  - [ ] Config tests pass
  - [ ] TokenCounter tests pass
  - [ ] OllamaClient tests pass
  - [ ] ContextManager tests pass
  - [ ] Agent tests pass
  - [ ] PlanManager tests pass
  - [ ] Tools tests pass

### Component Integration Test
- [ ] Run component test: `node test-components.js`
  - [ ] Config loads correctly
  - [ ] TokenCounter counts tokens
  - [ ] OllamaClient formats prompts
  - [ ] ContextManager manages context
  - [ ] Tools registry has 7 tools
  - [ ] Agent orchestrates tools
  - [ ] PlanManager uses correct directory
  - [ ] CLI commands exported
  - [ ] UI components available
  - [ ] File operations work

**Expected Result**: 10/10 tests pass ✅

---

## Phase 3: CLI Command Testing 📟

### Test 1: Basic Help & Info
- [ ] `node cli.js --help` shows all commands
- [ ] `node cli.js chat --help` shows chat options
- [ ] `node cli.js plan --help` shows plan options
- [ ] `node cli.js exec --help` shows exec options

### Test 2: Models Command (Ollama Connection)
**Purpose**: Verify Ollama connectivity
```bash
node cli.js models
```
- [ ] Shows list of installed models
- [ ] Displays model names and sizes
- [ ] No connection errors

**If fails**: Check Ollama is running (`ollama serve`)

### Test 3: Search Command (No AI)
**Purpose**: Verify file operations without AI
```bash
node cli.js search "Config" -n 5
```
- [ ] Finds matches in source files
- [ ] Shows file paths and line numbers
- [ ] Displays matched lines with context
- [ ] No errors

### Test 4: Analyze Command (Basic AI)
**Purpose**: Verify basic AI interaction
```bash
node cli.js analyze package.json --verbose
```
- [ ] Loads file successfully
- [ ] Sends request to Ollama (verbose output)
- [ ] Receives AI analysis
- [ ] Shows timing information
- [ ] Response is relevant to package.json

**Expected**: ~5-30 seconds depending on model

### Test 5: Chat Command (Interactive)
**Purpose**: Verify streaming chat functionality
```bash
node cli.js chat --verbose
```

**Test sequence**:
1. Type `help` → Shows available commands
   - [ ] Help message appears
2. Type `context` → Shows empty context
   - [ ] Current files: 0
3. Type `/load package.json` → Loads file
   - [ ] File loaded message
4. Type `context` → Shows 1 file
   - [ ] Shows package.json in context
5. Ask: `What is this project?`
   - [ ] Streaming response starts
   - [ ] Verbose shows API call
   - [ ] Response relates to the project
6. Ask: `What dependencies does it have?`
   - [ ] Response mentions actual dependencies
   - [ ] Context maintained from previous message
7. Type `/load src/core/Config.js`
   - [ ] Second file loaded
8. Type `context`
   - [ ] Shows 2 files
9. Type `clear`
   - [ ] Context cleared
10. Type `quit`
    - [ ] Exits cleanly

**Expected verbose output**:
- API request details
- Token counts
- Response timing
- Streaming chunks

---

## Phase 4: Plan Workflow Testing 📋

### Test 6: Simple Plan Creation
**Purpose**: Create a basic plan without execution
```bash
node cli.js plan "List all JavaScript files in the src directory" \
  --verbose
```

**Checklist**:
- [ ] Ollama generates plan
- [ ] Plan includes steps (e.g., list, glob tools)
- [ ] Plan preview shown as JSON
- [ ] Prompted to save (y/n)
- [ ] If saved, filename shown: `_saber_code_plans/list-all-javascript-files-*-*.json`
- [ ] Verbose shows timing and tokens

### Test 7: Plan with Context Loading
**Purpose**: Plan with loaded files for better context
```bash
node cli.js plan "Add error handling to the chat command" \
  --load "src/cli/commands/chat.js" \
  --verbose
```

**Checklist**:
- [ ] File loaded into context
- [ ] Plan is specific to chat.js
- [ ] Steps reference actual file path
- [ ] Steps use appropriate tools (read, edit, write)
- [ ] Plan makes technical sense
- [ ] Saved successfully

### Test 8: Plan Validation (Template Detection)
**Purpose**: Verify validation catches bad responses
```bash
node cli.js plan "Do something" --verbose
```

**Expected**:
- [ ] Model may return template/placeholders
- [ ] Validation catches it
- [ ] Error message explains the issue
- [ ] Suggests improvements:
  - More specific goal
  - Try different model
  - Load more context

**Test with better goal**:
```bash
node cli.js plan "Do something" --model mistral --verbose
```
- [ ] Better model may still fail with vague goal
- [ ] Validation still protects against templates

### Test 9: List Plans
**Purpose**: Verify plan storage and listing
```bash
node cli.js plans
```

**Checklist**:
- [ ] Shows all saved plans
- [ ] Displays: goal, steps count, date, file path
- [ ] Sorted by date (newest first)
- [ ] No errors

---

## Phase 5: Plan Execution Testing ⚡

### Test 10: Manual Plan Creation & Execution
**Purpose**: Test execution with controlled plan

Create a safe test plan:
```bash
mkdir -p test-workspace
cd test-workspace
cat > ../_saber_code_plans/safe-test-20260122-120000.json <<'EOF'
{
  "goal": "Create and read a test file",
  "steps": [
    {
      "tool": "write",
      "args": {
        "path": "test-workspace/hello.txt",
        "content": "Hello from Saber Code!"
      }
    },
    {
      "tool": "read",
      "args": {
        "path": "test-workspace/hello.txt"
      }
    },
    {
      "tool": "shell",
      "args": {
        "command": "ls -la test-workspace/"
      }
    }
  ],
  "createdAt": "2026-01-22T12:00:00.000Z"
}
EOF
cd ..
```

Execute the plan:
```bash
node cli.js exec _saber_code_plans/safe-test-20260122-120000.json
```

**Checklist**:
- [ ] Shows plan goal and file
- [ ] Step 1: Creates hello.txt
  - [ ] Success message
- [ ] Step 2: Reads hello.txt
  - [ ] Shows content: "Hello from Saber Code!"
- [ ] Step 3: Lists directory
  - [ ] Shows hello.txt in output
- [ ] Completion: "3 / 3 steps"
- [ ] No errors

**Verify**:
- [ ] `cat test-workspace/hello.txt` shows correct content

### Test 11: Plan Execution with Error (Stop on Error)
**Purpose**: Test error handling default behavior

Create error plan:
```bash
cat > _saber_code_plans/error-test-20260122-120001.json <<'EOF'
{
  "goal": "Test error handling - stop on error",
  "steps": [
    {
      "tool": "read",
      "args": {
        "path": "nonexistent-file.txt"
      }
    },
    {
      "tool": "write",
      "args": {
        "path": "test-workspace/should-not-exist.txt",
        "content": "This should not be created"
      }
    }
  ],
  "createdAt": "2026-01-22T12:00:01.000Z"
}
EOF
```

Execute:
```bash
node cli.js exec _saber_code_plans/error-test-20260122-120001.json
```

**Checklist**:
- [ ] Step 1 fails (file not found)
- [ ] Shows error message
- [ ] Execution stops
- [ ] Step 2 not attempted
- [ ] Shows "Failed at step: 0"
- [ ] Exit code indicates failure

**Verify**:
- [ ] `test-workspace/should-not-exist.txt` does NOT exist

### Test 12: Plan Execution with Error (Continue on Error)
**Purpose**: Test continue-on-error flag

Execute with flag:
```bash
node cli.js exec _saber_code_plans/error-test-20260122-120001.json --continue-on-error
```

**Checklist**:
- [ ] Step 1 fails (shows error)
- [ ] Execution continues
- [ ] Step 2 attempts and succeeds
- [ ] Shows "2 / 2 steps attempted"
- [ ] Shows which steps failed

**Verify**:
- [ ] `test-workspace/should-not-exist.txt` DOES exist now

### Test 13: Execute Latest Plan
**Purpose**: Verify latest plan detection
```bash
node cli.js exec
```

**Checklist**:
- [ ] Finds latest plan automatically
- [ ] Loads and executes it
- [ ] Shows plan details before execution
- [ ] Executes all steps

### Test 14: Plan and Execute (Full Workflow)
**Purpose**: Complete end-to-end workflow

Create a real plan:
```bash
node cli.js plan "Create a README in test-workspace explaining what this directory is for" \
  --load "test-workspace/**/*" \
  --execute \
  --yes \
  --verbose
```

**Checklist**:
- [ ] Loads context from test-workspace
- [ ] Creates relevant plan
- [ ] Shows plan preview
- [ ] Saves plan (--yes skips prompt)
- [ ] Executes immediately (--execute)
- [ ] Creates README.md in test-workspace
- [ ] README content is relevant
- [ ] Verbose shows all API calls

**Verify**:
- [ ] `cat test-workspace/README.md` shows relevant content

---

## Phase 6: Advanced Features Testing 🔥

### Test 15: Verbose Mode Deep Dive
**Purpose**: Understand system internals
```bash
node cli.js chat --verbose
```

In chat, ask: "Explain how the Config class works"

**Verify verbose output shows**:
- [ ] Context being loaded
- [ ] Token count for context
- [ ] Full prompt sent to API
- [ ] API request timestamp
- [ ] Model being used
- [ ] Streaming chunks count
- [ ] Total characters received
- [ ] Total time elapsed
- [ ] Response token estimate

### Test 16: Context Token Management
**Purpose**: Verify token limits and pruning
```bash
node cli.js chat --verbose
```

**Test sequence**:
1. Load many files:
   - `/load "src/**/*.js"`
2. Check context: `context`
   - [ ] Shows token count
3. If over limit, verify pruning:
   - [ ] Context summarized or oldest files dropped
   - [ ] Still functional
4. Ask a question about loaded files
   - [ ] Response is still relevant
   - [ ] No errors from token overflow

### Test 17: Multiple Models
**Purpose**: Test model switching
```bash
# With codellama (default)
node cli.js analyze README.md

# With mistral
node cli.js analyze README.md --model mistral

# Create plan with mistral (better instruction following)
node cli.js plan "Add logging to error handlers" \
  --model mistral \
  --load "src/**/*.js"
```

**Checklist**:
- [ ] Both models work
- [ ] Mistral typically produces better structured plans
- [ ] Model name shown in verbose output

### Test 18: Real Code Modification
**Purpose**: Actual file editing workflow

Create test file:
```bash
cat > test-workspace/math.js <<'EOF'
function add(a, b) {
  return a + b;
}

module.exports = { add };
EOF
```

Create plan:
```bash
node cli.js plan "Add a multiply function to math.js that takes two numbers and returns their product" \
  --load "test-workspace/math.js" \
  --execute \
  --yes \
  --verbose
```

**Checklist**:
- [ ] Plan created successfully
- [ ] Plan includes edit or write operation
- [ ] Execution modifies math.js
- [ ] New multiply function added
- [ ] Original add function preserved
- [ ] Code is syntactically correct

**Verify**:
```bash
cat test-workspace/math.js
```
- [ ] Shows both add and multiply functions
- [ ] multiply function is correctly implemented

**Test it**:
```bash
node -e "const {add, multiply} = require('./test-workspace/math.js'); console.log(add(2,3), multiply(2,3));"
```
- [ ] Outputs: `5 6`

---

## Phase 7: Error Recovery & Edge Cases 🛡️

### Test 19: Invalid Tool Arguments
**Purpose**: Verify tool validation

Create invalid plan:
```bash
cat > _saber_code_plans/invalid-20260122-120003.json <<'EOF'
{
  "goal": "Test invalid arguments",
  "steps": [
    {
      "tool": "read",
      "args": {}
    }
  ],
  "createdAt": "2026-01-22T12:00:03.000Z"
}
EOF
```

Execute:
```bash
node cli.js exec _saber_code_plans/invalid-20260122-120003.json
```

**Checklist**:
- [ ] Shows validation error (missing required 'path')
- [ ] Error message is clear
- [ ] Execution fails gracefully
- [ ] No crash

### Test 20: Ollama Connection Loss
**Purpose**: Test resilience to API failures

**Setup**:
1. Start Ollama: `ollama serve`
2. Start chat: `node cli.js chat`
3. Stop Ollama (Ctrl+C in ollama terminal)
4. Try to ask a question in chat

**Checklist**:
- [ ] Shows connection error
- [ ] Error message is informative
- [ ] Doesn't crash
- [ ] Can quit cleanly

**Recovery**:
1. Restart Ollama: `ollama serve`
2. Start new chat: `node cli.js chat`
3. Ask question
   - [ ] Works again

### Test 21: Large File Handling
**Purpose**: Test with large files

Create large file:
```bash
node -e "console.log('x'.repeat(100000))" > test-workspace/large.txt
```

Test read:
```bash
node cli.js analyze test-workspace/large.txt --verbose
```

**Checklist**:
- [ ] File loads successfully
- [ ] Token count shown in verbose
- [ ] May be truncated if too large
- [ ] No crash
- [ ] Response is reasonable

### Test 22: Git Integration Safety
**Purpose**: Verify safe file operations in git repo

**Setup**:
```bash
cd test-workspace
git init
git add .
git commit -m "Initial test workspace"
cd ..
```

Create destructive plan:
```bash
node cli.js plan "Delete all .txt files in test-workspace" \
  --load "test-workspace/**/*" \
  --verbose
```

**Checklist**:
- [ ] Plan created (review it carefully!)
- [ ] DO NOT execute (--execute flag)
- [ ] Review plan before confirming
- [ ] If plan uses shell with `rm`, be cautious

**Safety check**:
- [ ] Always review plans before execution
- [ ] Use git to track changes
- [ ] Can rollback with `git checkout .`

---

## Phase 8: Performance & Optimization 📊

### Test 23: Response Time Benchmarks

**Setup**: Note times for each

**Benchmark 1: Simple question**
```bash
time node cli.js chat --verbose
# Ask: "What is 2+2?"
```
- [ ] Recorded time: ________ seconds
- [ ] Expected: 2-10 seconds

**Benchmark 2: With context**
```bash
time node cli.js analyze package.json --verbose
```
- [ ] Recorded time: ________ seconds
- [ ] Expected: 5-30 seconds

**Benchmark 3: Plan creation**
```bash
time node cli.js plan "Add comments to Config.js" --load "src/core/Config.js" --verbose
```
- [ ] Recorded time: ________ seconds
- [ ] Expected: 10-60 seconds

**Benchmark 4: Plan execution**
```bash
time node cli.js exec _saber_code_plans/safe-test-20260122-120000.json
```
- [ ] Recorded time: ________ seconds
- [ ] Expected: 1-5 seconds (depends on steps)

### Test 24: Concurrent Operations
**Purpose**: Verify stability under load

Open 3 terminals, run simultaneously:
```bash
# Terminal 1
node cli.js search "Config" -n 10

# Terminal 2
node cli.js search "Agent" -n 10

# Terminal 3
node cli.js models
```

**Checklist**:
- [ ] All complete successfully
- [ ] No interference between processes
- [ ] Results are correct

---

## Phase 9: Integration & Workflow Testing 🔄

### Test 25: Full Development Workflow
**Purpose**: Simulate real development task

**Scenario**: Add input validation to a function

**Step 1**: Create sample code
```bash
cat > test-workspace/validator.js <<'EOF'
function processUser(user) {
  console.log("Processing:", user.name);
  return user;
}

module.exports = { processUser };
EOF
```

**Step 2**: Analyze what's needed
```bash
node cli.js analyze test-workspace/validator.js --verbose
```
- [ ] AI identifies lack of validation
- [ ] Suggests improvements

**Step 3**: Create improvement plan
```bash
node cli.js plan "Add input validation to processUser function to check if user exists and has a name property" \
  --load "test-workspace/validator.js" \
  --verbose
```
- [ ] Plan is created
- [ ] Review plan (looks good?)
- [ ] Save plan

**Step 4**: Execute plan
```bash
node cli.js exec --verbose
```
- [ ] Executes latest plan
- [ ] Modifies validator.js
- [ ] Adds validation

**Step 5**: Verify changes
```bash
cat test-workspace/validator.js
```
- [ ] Validation added
- [ ] Function still works
- [ ] Code quality good

**Step 6**: Test the code
```bash
node -e "const {processUser} = require('./test-workspace/validator.js'); processUser({name:'John'}); processUser(null);"
```
- [ ] Valid input works
- [ ] Invalid input handled

---

## Phase 10: Production Readiness ✨

### Test 26: Clean Installation Test
**Purpose**: Verify works on clean environment

**In new directory**:
```bash
cd /tmp
git clone /path/to/saber-code-cli saber-test
cd saber-test
npm install
node cli.js --help
```

**Checklist**:
- [ ] Installation succeeds
- [ ] No errors
- [ ] CLI works immediately
- [ ] Help displays correctly

### Test 27: Configuration Loading
**Purpose**: Test custom configuration

Create config:
```bash
cat > .saber-code.json <<'EOF'
{
  "ollama": {
    "defaultModel": "mistral",
    "timeout": 60000
  },
  "context": {
    "maxTokens": 4096
  }
}
EOF
```

Test with config:
```bash
node cli.js chat --verbose
# Ask a question
```

**Checklist**:
- [ ] Config file loaded (verbose shows it)
- [ ] Uses mistral model (not codellama)
- [ ] Custom settings applied
- [ ] No errors

### Test 28: Environment Variables
**Purpose**: Test env var overrides

Test:
```bash
SABER_CODE_MODEL=mistral node cli.js models
SABER_CODE_TIMEOUT=120000 node cli.js chat --verbose
```

**Checklist**:
- [ ] Environment variables respected
- [ ] Override config file settings
- [ ] Shown in verbose output

### Test 29: Error Messages Quality
**Purpose**: Verify user-friendly errors

**Test missing model**:
```bash
node cli.js chat --model nonexistent
```
- [ ] Clear error message
- [ ] Suggests available models
- [ ] Doesn't crash

**Test without Ollama**:
```bash
# Stop ollama first
node cli.js chat
```
- [ ] Clear connection error
- [ ] Explains Ollama not running
- [ ] Shows how to start it

### Test 30: Documentation Completeness
**Purpose**: Verify all documentation is accurate

**Checklist**:
- [ ] README.md is complete and accurate
- [ ] All commands documented
- [ ] Examples work as shown
- [ ] Configuration options documented
- [ ] Troubleshooting section helps
- [ ] Safety warnings prominent

---

## Final Validation ✅

### Code Quality
- [ ] All automated tests pass: `npm test`
- [ ] Component test passes: `node test-components.js`
- [ ] No linter errors: `npm run lint` (if available)
- [ ] Code is clean and readable

### Functionality
- [ ] All CLI commands work
- [ ] Chat is interactive and streaming
- [ ] Plans create, validate, save correctly
- [ ] Execution works with error handling
- [ ] Tools all function properly
- [ ] Verbose mode provides insights

### Safety
- [ ] Plan validation catches templates
- [ ] File operations are safe
- [ ] Git integration works
- [ ] Error handling is graceful
- [ ] Can recover from failures

### Performance
- [ ] Response times acceptable
- [ ] No memory leaks (long chat session)
- [ ] Handles large files
- [ ] Concurrent operations stable

### Documentation
- [ ] README complete
- [ ] Examples accurate
- [ ] Warnings prominent
- [ ] Setup instructions clear

---

## 🎉 Success Criteria

You've completed Zero to Hero when:
- [ ] ✅ All 30 tests passed
- [ ] ✅ Can confidently use chat command
- [ ] ✅ Can create and execute plans safely
- [ ] ✅ Understand verbose mode output
- [ ] ✅ Know how to recover from errors
- [ ] ✅ Comfortable with full workflow
- [ ] ✅ Ready for real development tasks

---

## 📝 Notes & Observations

Use this space to record issues, observations, or improvements needed:

```
Date: __________
Tester: __________

Issues Found:
- 
- 

Performance Notes:
- 
- 

Suggestions:
- 
- 
```

---

## 🚨 If Tests Fail

1. **Check Prerequisites**: Ollama running, models installed
2. **Check Logs**: Use `--verbose` flag
3. **Check Tests**: Run `npm run test:unit -- --verbose`
4. **Check Environment**: Node version, dependencies
5. **Consult**: README.md troubleshooting section
6. **Report**: Create detailed issue with test number and error

---

## Next Steps After Completion

Once all tests pass:
1. **Backup**: Commit all test files to git
2. **Clean up**: Remove test-workspace if desired
3. **Production**: Use on real projects (in contained environment)
4. **Monitor**: Watch for edge cases
5. **Improve**: Note areas for enhancement
6. **Share**: Document your experience

**Remember**: This tool modifies files. Always:
- Work in git repositories
- Review plans before executing
- Test in isolated environments first
- Keep backups

Good luck! 🚀
