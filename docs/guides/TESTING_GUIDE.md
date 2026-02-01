# Testing Guide

Step-by-step guide to test all features of Saber Code CLI.

## Prerequisites

1. Ollama running: `ollama serve`
2. Model installed: `ollama pull codellama:13b` or `ollama pull mistral`
3. Git repository initialized: `git init` (if not already)
4. Initial commit: `git add -A && git commit -m "Initial"`

## Test Plan

### Test 1: Component Verification

```bash
# Run component test
node test-components.js
```

**Expected**: All 10 tests pass ✓

---

### Test 2: Search Command (No Ollama needed)

```bash
# Search for "require" in the project
saber-code search "require" -n 10
```

**Expected**:
- Shows matching files and line numbers
- Displays matched lines
- No errors

---

### Test 3: Models Command

```bash
# List available models
saber-code models
```

**Expected**:
- Shows list of installed Ollama models
- Shows model sizes
- No errors

**If fails**: Ollama not running. Run `ollama serve`

---

### Test 4: Analyze Command

```bash
# Analyze package.json
saber-code analyze package.json --verbose
```

**Expected**:
- Shows verbose output (API request, timing)
- Shows file analysis from AI
- Displays duration

**Watch for**:
- API request details
- Response time
- Token counts

---

### Test 5: Chat Command (Basic)

```bash
# Start chat
saber-code chat --verbose
```

**In chat, test:**
1. Type `help` - shows commands
2. Type `context` - shows empty context
3. Type `/load package.json` - loads file
4. Type `context` - shows 1 file loaded
5. Ask `What is this project?` - streams response
6. Type `clear` - clears context
7. Type `quit` - exits

**Watch for**:
- Verbose output showing API calls
- Streaming chunks
- Token counts
- Timing information

---

### Test 6: Plan Command (Simple Goal)

```bash
# Create a simple plan
saber-code plan "Add a console.log to test-file.js" --load "test-components.js" --verbose
```

**Expected**:
1. Shows context loading
2. Shows API request to Ollama
3. Shows plan generation time
4. Displays plan preview with JSON
5. Prompts to save
6. If saved, shows file path

**Watch for**:
- Validation catching template responses
- Plan preview before saving
- File path: `_saber_code_plans/{goal-name}-{date}-{time}.json`

---

### Test 7: Plan Validation (Test with vague goal)

```bash
# Intentionally vague to trigger template response
saber-code plan "Do something"
```

**Expected**:
- Model may return template with placeholders
- Validation should catch and reject it
- Shows error: "Plan validation failed - model returned template"
- Suggests improvements

---

### Test 8: Plan with Better Context

```bash
# Create plan with more context
saber-code plan "Add error handling to Agent.js chat method" \
  --load "src/core/Agent.js" \
  --verbose
```

**Expected**:
- Loads Agent.js into context
- Creates specific plan with real paths
- Shows validation passing
- Plan has concrete steps (read, edit, write)

---

### Test 9: List Plans

```bash
# List all saved plans
saber-code plans
```

**Expected**:
- Shows all plans in `_saber_code_plans/`
- Shows goal, steps, date, path for each
- Sorted by date (newest first)

---

### Test 10: Execute Plan (Dry Run)

```bash
# First, create a simple safe plan
cat > _saber_code_plans/test-plan-20240122-120000.json <<'EOF'
{
  "goal": "List files in src/core",
  "steps": [
    { "tool": "list", "args": { "path": "src/core" } },
    { "tool": "shell", "args": { "command": "echo 'Test complete'" } }
  ],
  "createdAt": "2024-01-22T12:00:00.000Z"
}
EOF

# Execute it
saber-code exec _saber_code_plans/test-plan-20240122-120000.json
```

**Expected**:
- Shows plan goal and file
- Executes list tool
- Executes shell command
- Shows "Completed: 2 / 2 steps"
- No errors

---

### Test 11: Execute Latest Plan

```bash
# Execute most recent plan
saber-code exec
```

**Expected**:
- Loads latest plan from `_saber_code_plans/`
- Executes steps
- Shows results

---

### Test 12: Plan with Execution

```bash
# Create and execute immediately
saber-code plan "List all JavaScript files in src" \
  --load "src/**/*.js" \
  --execute \
  --yes \
  --verbose
```

**Expected**:
1. Loads context
2. Creates plan
3. Shows preview
4. Saves (--yes skips prompt)
5. Executes immediately
6. Shows results

---

### Test 13: Error Handling

```bash
# Create plan with intentional error
cat > _saber_code_plans/error-test-20240122-120001.json <<'EOF'
{
  "goal": "Test error handling",
  "steps": [
    { "tool": "read", "args": { "path": "nonexistent.js" } },
    { "tool": "shell", "args": { "command": "echo 'Should not reach'" } }
  ],
  "createdAt": "2024-01-22T12:00:01.000Z"
}
EOF

# Execute without continue-on-error (should stop at error)
saber-code exec _saber_code_plans/error-test-20240122-120001.json

# Execute with continue-on-error (should continue)
saber-code exec _saber_code_plans/error-test-20240122-120001.json --continue-on-error
```

**Expected**:
- First run: Stops at step 1, shows error, failedAt: 0
- Second run: Shows error for step 1, continues to step 2, completes

---

### Test 14: Context Token Limits

```bash
# Load many files to test pruning
saber-code chat --verbose
# In chat: /load "src/**/*.js"
# Then ask a question
```

**Expected**:
- Shows token count
- Context pruned if over limit
- Still functions correctly

---

### Test 15: Streaming Performance

```bash
# Test streaming with verbose
saber-code chat --verbose
# Ask: "Explain all the files in src/core in detail"
```

**Expected**:
- Shows streaming stats (chunks, chars)
- Shows duration
- Response streams in real-time

---

## Success Criteria

- [ ] All component tests pass
- [ ] Search works without Ollama
- [ ] Models lists when Ollama running
- [ ] Chat streams responses
- [ ] Plan creates and saves correctly
- [ ] Plan validation catches templates
- [ ] Exec runs plans successfully
- [ ] Plans list shows all plans
- [ ] Verbose mode shows API details
- [ ] Error handling works
- [ ] Context token limits enforced

## Safety Checklist

Before each test:
- [ ] Working in test directory
- [ ] Git commit made
- [ ] Backup of important files
- [ ] Reviewed plan before executing
- [ ] Understand what tools will do

## Troubleshooting

**Ollama not responding**:
```bash
# Check Ollama
ps aux | grep ollama
ollama list
curl http://localhost:11434/api/tags
```

**Plan returns template**:
- Try: `--model mistral` (better instruction following)
- Load more context: `--load "src/**/*.js"`
- Make goal more specific

**Tests fail**:
```bash
# Run with verbose
npm run test:unit -- --verbose
```

## Next: Manual Testing Session

Run through tests 1-15 above, checking each expected outcome. Report any failures or unexpected behavior.
