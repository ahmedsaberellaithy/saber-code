const { glob } = require('glob');

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/*.log',
  '**/coverage/**'
];

/**
 * Glob file discovery. ctx: { rootPath }.
 */
const name = 'glob';
const description = 'Find files matching glob pattern(s).';

const schema = {
  pattern: { type: 'string', description: 'Glob pattern (e.g. **/*.js)' },
  patterns: { type: 'array', items: { type: 'string' }, description: 'Multiple glob patterns' }
};

async function execute(ctx, args) {
  const patterns = args.patterns ?? (args.pattern ? [args.pattern] : null);
  if (!patterns || patterns.length === 0) throw new Error('glob: provide pattern or patterns');

  const all = new Set();
  for (const p of patterns) {
    const files = await glob(p, {
      cwd: ctx.rootPath,
      ignore: DEFAULT_IGNORE,
      nodir: true
    });
    files.forEach((f) => all.add(f));
  }

  return { patterns: patterns, files: [...all].sort() };
}

module.exports = { name, description, schema, execute };
