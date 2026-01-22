/**
 * PlanManager: plan creation, storage, and execution.
 */

const fs = require('fs').promises;
const path = require('path');
const { Agent } = require('./Agent');
const Logger = require('../utils/logger');
const chalk = require('chalk');

const PLAN_PROMPT = `You are creating an execution plan. Return ONLY valid JSON (no markdown, no explanations, no code blocks).

The JSON must have this structure:
{
  "goal": "actual goal description here",
  "steps": [
    { "tool": "read", "args": { "path": "actual/file/path.js" } },
    { "tool": "write", "args": { "path": "actual/file/path.js", "content": "actual file content" } }
  ]
}

CRITICAL: 
- Replace ALL placeholders with REAL values
- Use actual file paths from the project context
- Use actual content, not "..."
- The goal must be the actual goal, not "<goal string>"
- Each step must have real, executable arguments

Available tools: read, write, edit, list, search, glob, shell.
Be specific and concrete - no placeholders allowed.`;

function stripJson(raw) {
  let s = typeof raw === 'string' ? raw : String(raw);
  
  // Try to extract from markdown code blocks
  const codeBlockMatch = s.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    s = codeBlockMatch[1];
  }
  
  // Find JSON object boundaries
  let start = s.indexOf('{');
  if (start === -1) return null;
  
  // Find matching closing brace
  let depth = 0;
  let end = start;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++;
    if (s[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  
  if (end <= start) return null;
  let jsonStr = s.slice(start, end);
  
  // Fix common JSON issues
  // Remove trailing commas before } or ]
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
  // Fix single quotes to double quotes for keys
  jsonStr = jsonStr.replace(/'([^']+)':/g, '"$1":');
  // Fix unquoted keys (simple cases)
  jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  return jsonStr;
}

function sanitizeFilename(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function generatePlanFilename(goal) {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
  const name = sanitizeFilename(goal || 'plan');
  return `${name}-${dateStr}-${timeStr}.json`;
}

class PlanManager {
  /**
   * @param {import('./Config').Config} config
   * @param {import('./Agent')} [agent]
   */
  constructor(config, agent) {
    this.config = config;
    this.agent = agent || new Agent(config);
    this._plansDir = path.join(config.rootPath, '_saber_code_plans');
  }

  setVerbose(enabled) {
    if (this.agent) {
      this.agent.setVerbose(enabled);
    }
  }

  async _ensurePlansDir() {
    await fs.mkdir(this._plansDir, { recursive: true });
  }

  /**
   * Create plan from goal using Agent. Batches context, calls model, parses JSON.
   */
  async create(goal, options = {}) {
    const model = options.model ?? this.agent.ollama.defaultModel;
    const contextOpts = options.context ?? {};

    const { text: ctx } = this.agent.getContextForPrompt(
      (this.config.context.maxContextTokens ?? 8000) * 0.5
    );

    const userMsg = `Goal: ${goal}\n\n${PLAN_PROMPT}\n\n---\nProject context:\n${ctx || '(none)'}`;
    
    if (this.agent.verbose) {
      console.log(chalk.magenta('\n🎯 Creating Plan:'));
      console.log(chalk.gray(`  Goal: ${goal}`));
      console.log(chalk.gray(`  Model: ${model}`));
      console.log(chalk.gray(`  Context size: ${ctx ? ctx.length : 0} chars\n`));
    }

    const planStartTime = Date.now();
    const res = await this.agent.chat(userMsg, { model, stream: false });
    const planDuration = Date.now() - planStartTime;

    if (this.agent.verbose) {
      console.log(chalk.cyan(`\n⏱️  Plan generation time: ${(planDuration / 1000).toFixed(2)}s\n`));
    }

    const raw = res.content ?? '';
    const jsonStr = stripJson(raw);
    if (!jsonStr) {
      throw new Error(`Plan creation failed: could not parse JSON from model output.\nRaw: ${raw.slice(0, 500)}`);
    }

    let plan;
    try {
      plan = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(`Plan creation failed: invalid JSON.\n${e.message}`);
    }

    if (!Array.isArray(plan.steps)) {
      plan.steps = [];
    }
    plan.goal = plan.goal || goal;
    plan.createdAt = plan.createdAt || new Date().toISOString();

    // Validate plan - check for template/placeholder values
    const validationErrors = [];
    
    if (!plan.goal || plan.goal === '<goal string>' || plan.goal === '...' || plan.goal.trim() === '') {
      validationErrors.push('Goal is missing or contains placeholder');
    }
    
    if (plan.steps.length === 0) {
      validationErrors.push('Plan has no steps');
    }
    
    // Check for placeholder values in steps
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (!step.tool) {
        validationErrors.push(`Step ${i + 1}: missing tool`);
        continue;
      }
      
      if (!step.args) {
        validationErrors.push(`Step ${i + 1}: missing args`);
        continue;
      }
      
      // Check for placeholder values
      const argsStr = JSON.stringify(step.args);
      if (argsStr.includes('"..."') || argsStr.includes('"<') || argsStr.includes('<goal') || argsStr.includes('<path>')) {
        validationErrors.push(`Step ${i + 1} (${step.tool}): contains placeholder values like "..." or "<...>"`);
      }
      
      // Check for empty or placeholder paths/content
      if (step.args.path === '...' || step.args.path === '<path>' || (step.args.path && step.args.path.includes('...'))) {
        validationErrors.push(`Step ${i + 1} (${step.tool}): path contains placeholder`);
      }
      
      if (step.args.content === '...' || step.args.content === '<content>' || (step.args.content && step.args.content.includes('...'))) {
        validationErrors.push(`Step ${i + 1} (${step.tool}): content contains placeholder`);
      }
      
      if (step.args.command === '...' || step.args.command === '<command>') {
        validationErrors.push(`Step ${i + 1} (${step.tool}): command contains placeholder`);
      }
    }
    
    if (validationErrors.length > 0) {
      throw new Error(
        `Plan validation failed - model returned template instead of real plan:\n${validationErrors.map(e => '  - ' + e).join('\n')}\n\n` +
        `Suggestions:\n` +
        `  - Make the goal more specific and detailed\n` +
        `  - Try a different model: saber-code plan "goal" -m mistral\n` +
        `  - Load more context: --load "src/**/*.js" "package.json"\n` +
        `  - Break down into smaller goals`
      );
    }

    // Generate filename but don't save yet
    const filename = generatePlanFilename(goal);
    const planPath = path.join(this._plansDir, filename);

    return { plan, planPath, filename };
  }

  /**
   * Load plan from disk. If no path provided, loads the latest plan.
   */
  async load(planPath = null) {
    if (!planPath) {
      planPath = await this._findLatestPlan();
      if (!planPath) return null;
    }
    
    try {
      const raw = await fs.readFile(planPath, 'utf8');
      return { plan: JSON.parse(raw), planPath };
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  /**
   * Find the latest plan file by creation time.
   */
  async _findLatestPlan() {
    try {
      const files = await fs.readdir(this._plansDir);
      const planFiles = files.filter(f => f.endsWith('.json'));
      if (planFiles.length === 0) return null;
      
      // Sort by filename (date/time) descending
      planFiles.sort().reverse();
      return path.join(this._plansDir, planFiles[0]);
    } catch (e) {
      return null;
    }
  }

  /**
   * List all plan files.
   */
  async listPlans() {
    try {
      const files = await fs.readdir(this._plansDir);
      const planFiles = files
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(this._plansDir, f))
        .sort()
        .reverse();
      return planFiles;
    } catch (e) {
      return [];
    }
  }

  /**
   * Save plan to disk.
   */
  async savePlan(plan, planPath) {
    await this._ensurePlansDir();
    await fs.writeFile(planPath, JSON.stringify(plan, null, 2), 'utf8');
    return planPath;
  }

  /**
   * Execute plan steps via Agent's tool registry. Stops on first error unless options.continueOnError.
   */
  async execute(planOrPathOrOptions = {}, options = {}) {
    let plan, planPath;
    
    if (typeof planOrPathOrOptions === 'string') {
      // Path provided
      const loaded = await this.load(planOrPathOrOptions);
      if (!loaded) throw new Error(`Plan not found: ${planOrPathOrOptions}`);
      plan = loaded.plan;
      planPath = loaded.planPath;
    } else if (Array.isArray(planOrPathOrOptions?.steps)) {
      // Plan object provided
      plan = planOrPathOrOptions;
      planPath = null;
    } else {
      // Load latest
      const loaded = await this.load();
      if (!loaded) {
        throw new Error('No plan found in _saber_code_plans/. Create one with "saber-code plan <goal>".');
      }
      plan = loaded.plan;
      planPath = loaded.planPath;
    }
    
    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error('Invalid plan: missing steps array.');
    }

    const continueOnError = options.continueOnError ?? false;
    const results = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const tool = step.tool;
      const args = step.args || {};

      try {
        const out = await this.agent.runTool(tool, args);
        results.push({ index: i, tool, args, ok: true, result: out });
      } catch (e) {
        results.push({ index: i, tool, args, ok: false, error: e.message });
        if (!continueOnError) {
          return { plan, results, failedAt: i };
        }
      }
    }

    return { plan, planPath, results, failedAt: null };
  }

  /**
   * Clear plan file(s). If no path, clears latest.
   */
  async clear(planPath = null) {
    if (!planPath) {
      planPath = await this._findLatestPlan();
      if (!planPath) return this;
    }
    
    try {
      await fs.unlink(planPath);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    return this;
  }
}

module.exports = { PlanManager };
