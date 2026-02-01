/**
 * List directory contents. ctx: { rootPath, fileUtils }.
 */
const name = 'list';
const description = 'List directory contents. Use path for directory (default: project root).';

const schema = {
  path: { type: 'string', description: 'Directory path (relative to project root, default ".")' }
};

async function execute(ctx, args) {
  const { fileUtils } = ctx;
  const dir = args.path ?? '.';

  const entries = await fileUtils.readdir(dir, { withFileTypes: true });
  const items = entries.map((e) => ({
    name: e.name,
    type: e.isDirectory() ? 'dir' : 'file'
  }));

  return { path: dir, entries: items, files: items };
}

module.exports = { name, description, schema, execute };
