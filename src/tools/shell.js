const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

/**
 * Run shell command. ctx: { rootPath }.
 */
const name = 'shell';
const description = 'Run a shell command in project root (or cwd).';

const schema = {
  command: { type: 'string', description: 'Shell command to run' },
  cwd: { type: 'string', description: 'Working directory (default: project root)' }
};

async function execute(ctx, args) {
  const cmd = args.command;
  if (!cmd || typeof cmd !== 'string') throw new Error('shell: provide command');

  const cwd = args.cwd
    ? path.resolve(ctx.rootPath, args.cwd)
    : ctx.rootPath;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000,
      shell: true
    });
    return {
      exitCode: 0,
      stdout: (stdout || '').trim(),
      stderr: (stderr || '').trim()
    };
  } catch (e) {
    const code = e.code ?? (e.killed ? 124 : 1);
    return {
      exitCode: typeof code === 'number' ? code : 1,
      stdout: (e.stdout || '').trim(),
      stderr: (e.stderr || e.message || '').trim()
    };
  }
}

module.exports = { name, description, schema, execute };
