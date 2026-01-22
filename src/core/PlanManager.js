/**
 * PlanManager: plan creation, storage, and execution.
 */

const fs = require('fs').promises;
const path = require('path');
const { Agent } = require('./Agent');

const PLAN_PROMPT = `Given the goal and project context, produce a JSON plan with this exact structure (no markdown, no extra text):
{
  "goal": "<goal string>",
  "steps": [
    { "tool": "read", "args": { "path": "..." } },
    { "tool": "edit", "args": { "path": "...", "oldText": "...", "newText": "..." } },
    { "tool": "write", "args": { "path": "...", "content": "..." } },
    { "tool": "shell", "args": { "command": "..." } }
  ]
}
Use only tools: read, write, edit, list, search, glob, shell. Be specific with paths and content.`;

function stripJson(raw) {
  let s = typeof raw === 'string' ? raw : String(raw);
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}') + 1;
  if (start === -1 || end <= start) return null;
  return s.slice(start, end);
}

class PlanManager {
  /**
   * @param {import('./Config').Config} config
   * @param {import('./Agent')} [agent]
   */
  constructor(config, agent) {
    this.config = config;
    this.agent = agent || new Agent(config);
    this._planPath = config.planPath;
    this._historyDir = config.historyDirPath;
  }

  async _ensureHistoryDir() {
    await fs.mkdir(this._historyDir, { recursive: true });
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
    const res = await this.agent.chat(userMsg, { model, stream: false });

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

    await this._ensureHistoryDir();
    await fs.writeFile(this._planPath, JSON.stringify(plan, null, 2), 'utf8');

    return plan;
  }

  /**
   * Load plan from disk.
   */
  async load() {
    try {
      const raw = await fs.readFile(this._planPath, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  /**
   * Save plan to disk.
   */
  async save(plan) {
    await this._ensureHistoryDir();
    await fs.writeFile(this._planPath, JSON.stringify(plan, null, 2), 'utf8');
    return plan;
  }

  /**
   * Execute plan steps via Agent's tool registry. Stops on first error unless options.continueOnError.
   */
  async execute(planOrOptions = {}, options = {}) {
    const plan = Array.isArray(planOrOptions?.steps)
      ? planOrOptions
      : await this.load();
    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error('No plan to execute. Create one with "saber-code plan <goal>".');
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

    return { plan, results, failedAt: null };
  }

  /**
   * Clear plan file.
   */
  async clear() {
    try {
      await fs.unlink(this._planPath);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    return this;
  }
}

module.exports = { PlanManager };
