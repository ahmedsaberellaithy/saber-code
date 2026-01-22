const { glob } = require('glob');
const path = require('path');

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/*.log',
  '**/coverage/**'
];

/**
 * Grep-like search across files. ctx: { rootPath, fileUtils }.
 */
const name = 'search';
const description = 'Search for pattern in files. Uses glob pattern to select files, then grep.';

const schema = {
  pattern: { type: 'string', description: 'Search pattern (string or regex)' },
  glob: { type: 'string', description: 'File glob pattern (default: **/*)' },
  maxResults: { type: 'number', description: 'Max matches to return (default: 50)' }
};

async function execute(ctx, args) {
  const { fileUtils } = ctx;
  const pattern = args.pattern;
  const globPattern = args.glob ?? '**/*';
  const maxResults = Math.min(Number(args.maxResults) || 50, 200);

  if (!pattern) throw new Error('search: provide pattern');

  let regex;
  try {
    regex = new RegExp(pattern, 'gi');
  } catch {
    regex = new RegExp(escapeRegex(pattern), 'gi');
  }

  const files = await glob(globPattern, {
    cwd: ctx.rootPath,
    ignore: DEFAULT_IGNORE,
    nodir: true
  });

  const results = [];
  for (const f of files) {
    if (results.length >= maxResults) break;
    try {
      const content = await fileUtils.readFile(f);
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length && results.length < maxResults; i++) {
        const line = lines[i];
        const m = line.match(regex);
        if (m) {
          results.push({
            path: f,
            lineNumber: i + 1,
            line: line.trim(),
            match: m[0]
          });
        }
      }
    } catch (_) {
      // skip unreadable
    }
  }

  return { pattern, total: results.length, matches: results };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { name, description, schema, execute };
