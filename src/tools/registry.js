/**
 * Tool registry: register tools, validate args against schema, execute.
 */

const VALIDATORS = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && !Number.isNaN(v),
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v),
  object: (v) => v != null && typeof v === 'object' && !Array.isArray(v)
};

function validateOne(spec, value, key) {
  if (value == null) return null;
  const type = spec.type;
  if (!type) return null;
  const check = VALIDATORS[type];
  if (!check) return null;
  if (!check(value)) {
    return `Expected ${type} for ${key}, got ${typeof value}`;
  }
  if (type === 'array' && spec.items) {
    const itemType = spec.items.type;
    const itemCheck = VALIDATORS[itemType];
    if (itemCheck) {
      for (let i = 0; i < value.length; i++) {
        if (!itemCheck(value[i])) {
          return `Expected ${itemType} in ${key}[${i}], got ${typeof value[i]}`;
        }
      }
    }
  }
  if (spec.enum && !spec.enum.includes(value)) {
    return `Expected one of [${spec.enum.join(', ')}] for ${key}`;
  }
  return null;
}

function validateArgs(tool, args) {
  const schema = tool.schema || {};
  const errors = [];
  for (const [key, spec] of Object.entries(schema)) {
    const v = args[key];
    const err = validateOne(spec, v, key);
    if (err) errors.push(err);
  }
  return errors;
}

class ToolRegistry {
  constructor() {
    this._tools = new Map();
  }

  /**
   * Register a tool. Tool: { name, description, schema, execute }.
   */
  register(tool) {
    const name = tool.name;
    if (!name || typeof tool.execute !== 'function') {
      throw new Error('Tool must have name and execute function');
    }
    this._tools.set(name, tool);
    return this;
  }

  /**
   * Register multiple tools.
   */
  registerAll(tools) {
    for (const t of tools) this.register(t);
    return this;
  }

  get(name) {
    return this._tools.get(name) || null;
  }

  list() {
    return [...this._tools.values()];
  }

  has(name) {
    return this._tools.has(name);
  }

  /**
   * Validate args for a tool. Returns array of error strings (empty if valid).
   */
  validate(toolName, args) {
    const tool = this.get(toolName);
    if (!tool) return [`Unknown tool: ${toolName}`];
    return validateArgs(tool, args || {});
  }

  /**
   * Run tool. Validates, then executes. Throws on validation error or if tool throws.
   */
  async run(toolName, ctx, args) {
    const tool = this.get(toolName);
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);

    const errs = validateArgs(tool, args || {});
    if (errs.length) throw new Error(`Tool ${toolName}: ${errs.join('; ')}`);

    return tool.execute(ctx, args || {});
  }
}

module.exports = { ToolRegistry, validateArgs };
