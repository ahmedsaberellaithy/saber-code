/**
 * Targeted edit: replace oldText with newText, or insert at line.
 * ctx: { rootPath, fileUtils }.
 */
const name = 'edit';
const description = 'Edit a file: replace oldText with newText, or insert content at line.';

const schema = {
  path: { type: 'string', description: 'File path (relative to project root)' },
  oldText: { type: 'string', description: 'Exact text to replace (for replace operation)' },
  newText: { type: 'string', description: 'Replacement or inserted content' },
  line: { type: 'number', description: 'Line number for insert (1-based)' },
  operation: { type: 'string', enum: ['replace', 'insert'], description: 'replace or insert' }
};

async function execute(ctx, args) {
  const { fileUtils } = ctx;
  const { path: filePath, oldText, newText, line, operation } = args;
  if (!filePath) throw new Error('edit: provide path');

  const op = (operation || (line != null ? 'insert' : 'replace')).toLowerCase();
  const content = newText != null ? String(newText) : '';

  if (op === 'replace') {
    if (oldText == null) throw new Error('edit replace: provide oldText and newText');
    const current = await fileUtils.readFile(filePath);
    const replaced = current.replace(oldText, content);
    if (replaced === current) {
      throw new Error(`edit: oldText not found in ${filePath}`);
    }
    await fileUtils.writeFile(filePath, replaced);
    return { path: filePath, operation: 'replace', done: true };
  }

  if (op === 'insert') {
    const num = line != null ? Number(line) : 1;
    if (!Number.isInteger(num) || num < 1) throw new Error('edit insert: provide valid line (>= 1)');
    const current = await fileUtils.readFile(filePath);
    const lines = current.split(/\r?\n/);
    const idx = Math.min(num - 1, lines.length);
    lines.splice(idx, 0, content);
    await fileUtils.writeFile(filePath, lines.join('\n'));
    return { path: filePath, operation: 'insert', line: num, done: true };
  }

  throw new Error('edit: operation must be replace or insert');
}

module.exports = { name, description, schema, execute };
