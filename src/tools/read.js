/**
 * Read file(s) and return content. ctx: { rootPath, fileUtils }.
 */
const name = 'read';
const description = 'Read file contents. Use path for a single file or paths for multiple.';

const schema = {
  path: { type: 'string', description: 'Path to a single file (relative to project root)' },
  paths: { type: 'array', items: { type: 'string' }, description: 'Paths to multiple files' }
};

async function execute(ctx, args) {
  const { fileUtils } = ctx;
  const paths = args.paths ?? (args.path ? [args.path] : null);
  if (!paths || paths.length === 0) {
    throw new Error('read: provide path or paths');
  }

  const results = [];
  for (const p of paths) {
    try {
      const content = await fileUtils.readFile(p);
      results.push({ path: p, content, error: null });
    } catch (e) {
      results.push({ path: p, content: null, error: e.message });
    }
  }

  if (results.length === 1) {
    const r = results[0];
    if (r.error) throw new Error(`read ${r.path}: ${r.error}`);
    return { path: r.path, content: r.content };
  }
  return { files: results };
}

module.exports = { name, description, schema, execute };
