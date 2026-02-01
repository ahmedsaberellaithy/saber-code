/**
 * Create or overwrite a file. ctx: { rootPath, fileUtils }.
 */
const name = 'write';
const description = 'Create or overwrite a file with given content.';

const schema = {
  path: { type: 'string', description: 'File path (relative to project root)' },
  content: { type: 'string', description: 'File content' }
};

async function execute(ctx, args) {
  const { fileUtils } = ctx;
  const { path: filePath, content } = args;
  if (!filePath || content == null) {
    throw new Error('write: provide path and content');
  }

  await fileUtils.writeFile(filePath, typeof content === 'string' ? content : String(content));
  return { path: filePath, written: true, success: true };
}

module.exports = { name, description, schema, execute };
