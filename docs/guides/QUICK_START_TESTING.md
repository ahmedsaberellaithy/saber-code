# 🚀 Quick Start Testing Guide

Follow these steps in order to verify the project works correctly.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js v14+ installed
- [ ] Ollama installed and running
- [ ] At least one Ollama model pulled (codellama:13b or mistral)
- [ ] Project dependencies installed (`npm install`)

## Step 1: Component Test (2 minutes)

Verify all components integrate correctly:

```bash
node test-components.js
```

**Expected output:**
```
🧪 Saber Code CLI - Component Test

Testing Config... ✓
Testing TokenCounter... ✓
Testing OllamaClient... ✓
Testing ContextManager... ✓
Testing Tools Registry... ✓
Testing Agent... ✓
Testing PlanManager... ✓
Testing CLI Commands... ✓
Testing UI Components... ✓
Testing File Operations... ✓

📊 Test Results:
  Passed: 10/10

✅ All components working!
```

**If fails:** Check that npm install completed successfully.

---

## Step 2: Unit Tests (30 seconds)

Run automated unit tests:

```bash
npm run test:unit
```

**Expected output:**
```
Test Suites: 11 passed, 11 total
Tests:       147 passed, 147 total
```

**If fails:** Review error messages and check test files.

---

## Step 3: Basic CLI Test (1 minute)

Test the CLI is accessible:

```bash
# Show help
node cli.js --help

# List models
node cli.js models

# Search for a pattern
node cli.js search "Config"
```

**Expected:**
- Help shows all commands
- Models lists installed Ollama models
- Search finds matches in source files

---

## Step 4: Interactive Chat Test (3 minutes)

Test streaming chat functionality:

```bash
node cli.js chat --verbose
```

**In the chat:**
1. Type: `help` → Shows commands
2. Type: `context` → Shows empty context
3. Type: `/load package.json` → Loads file
4. Ask: `What is this project?` → Gets AI response
5. Type: `quit` → Exits

**Expected:**
- Verbose mode shows API calls and timing
- Responses stream in real-time
- Context tracking works

---

## Step 5: Plan Creation Test (5 minutes)

Test plan creation and validation:

```bash
# Create test workspace
mkdir -p test-workspace

# Create a simple file
echo 'function hello() { return "world"; }' > test-workspace/test.js

# Create plan
node cli.js plan "Add console.log to hello function" \
  --load "test-workspace/test.js" \
  --verbose
```

**Expected:**
- Plan is generated
- Shows JSON preview
- Prompts to save
- If saved, shows path in `_saber_code_plans/`

---

## Step 6: Plan Execution Test (3 minutes)

Execute a safe plan:

```bash
# Create a simple safe plan
cat > _saber_code_plans/test-plan-$(date +%Y%m%d-%H%M%S).json <<'EOF'
{
  "goal": "Create a test file",
  "steps": [
    {
      "tool": "write",
      "args": {
        "path": "test-workspace/output.txt",
        "content": "Test successful!"
      }
    },
    {
      "tool": "read",
      "args": {
        "path": "test-workspace/output.txt"
      }
    }
  ],
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Execute it
node cli.js exec
```

**Expected:**
- Executes latest plan
- Creates output.txt
- Shows results
- Verify: `cat test-workspace/output.txt` shows "Test successful!"

---

## Step 7: Error Handling Test (2 minutes)

Test error recovery:

```bash
# Create plan with intentional error
cat > _saber_code_plans/error-test-$(date +%Y%m%d-%H%M%S).json <<'EOF'
{
  "goal": "Test error handling",
  "steps": [
    {
      "tool": "read",
      "args": {
        "path": "test-workspace/nonexistent.txt"
      }
    },
    {
      "tool": "write",
      "args": {
        "path": "test-workspace/after-error.txt",
        "content": "Created despite error"
      }
    }
  ],
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Test stop-on-error (default)
node cli.js exec

# Test continue-on-error
node cli.js exec --continue-on-error
```

**Expected:**
- First run: Stops at error, step 2 not executed
- Second run: Shows error but continues, step 2 executes

---

## Step 8: Full Workflow Test (10 minutes)

Complete end-to-end workflow:

```bash
# 1. Create sample code
cat > test-workspace/calculator.js <<'EOF'
function add(a, b) {
  return a + b;
}

module.exports = { add };
EOF

# 2. Analyze it
node cli.js analyze test-workspace/calculator.js

# 3. Create improvement plan
node cli.js plan "Add a multiply function to calculator.js" \
  --load "test-workspace/calculator.js" \
  --execute \
  --yes \
  --verbose

# 4. Verify changes
cat test-workspace/calculator.js
```

**Expected:**
- Analysis describes the code
- Plan is created and executed automatically
- calculator.js now has both add and multiply functions
- Code is syntactically correct

---

## ✅ Success Criteria

You've successfully tested the project if:

- [ ] Component test shows 10/10 pass
- [ ] Unit tests show 147/147 pass
- [ ] CLI commands execute without errors
- [ ] Chat provides streaming responses
- [ ] Plans create with validation
- [ ] Plans execute successfully
- [ ] Error handling works correctly
- [ ] Full workflow modifies code as expected

---

## 🚨 Troubleshooting

### Ollama not responding
```bash
# Check Ollama is running
ollama serve

# In another terminal, verify
curl http://localhost:11434/api/tags
```

### Model not found
```bash
# List installed models
ollama list

# Install recommended model
ollama pull codellama:13b
# or
ollama pull mistral
```

### Plan validation fails
- **Issue**: "Plan returned template instead of real plan"
- **Solution**: 
  - Make goal more specific
  - Try `--model mistral` (better instruction following)
  - Load more context with `--load "file.js"`

### Tests fail
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Run specific test
npm run test:unit -- --testNamePattern="PlanManager"
```

---

## 📝 Next Steps

After completing these tests:

1. ✅ **Mark as working** - Your setup is correct
2. 📖 **Read full guide** - See ZERO_TO_HERO.md for comprehensive testing
3. 🚀 **Use on real project** - Start with simple tasks in a contained environment
4. 📊 **Report issues** - Note any unexpected behavior

---

## ⏱️ Total Time

- **Automated tests**: ~3 minutes
- **Manual tests**: ~15 minutes  
- **Total**: ~18 minutes

**You'll know the project works correctly end-to-end in under 20 minutes!**

---

## 🎉 Completion

Once all steps pass:

```bash
# Clean up test workspace if desired
rm -rf test-workspace
rm -rf _saber_code_plans

# Or keep for reference
echo "Setup complete! Ready for production use."
```

**Remember**: Always use in git repositories with backups. This tool modifies files!
