/**
 * Chat command: interactive session with streaming output.
 */

const inquirer = require('inquirer');
const { Config, Agent } = require('../../core');
const { createSpinner, chalk } = require('../ui');
const { glob } = require('glob');
const { FileUtils } = require('../../utils/fileUtils');

const DEFAULT_IGNORE = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/coverage/**'];

async function loadFilesIntoAgent(agent, patterns, rootPath) {
  const fileUtils = new FileUtils(rootPath);
  const all = new Set();
  for (const p of patterns) {
    const files = await glob(p, { cwd: rootPath, ignore: DEFAULT_IGNORE, nodir: true });
    files.forEach((f) => all.add(f));
  }
  const list = [...all];
  for (const f of list) {
    try {
      const content = await fileUtils.readFile(f);
      agent.addFile(f, content);
    } catch (_) {
      // skip unreadable
    }
  }
  return list.length;
}

function showHelp() {
  console.log('\n' + chalk.blue.bold('Commands:'));
  console.log('  help       - Show this message');
  console.log('  context    - Show loaded files and recent changes');
  console.log('  clear      - Clear context (files, history)');
  console.log('  quit       - Exit chat');
  console.log('  /load <pattern>  - Load files (e.g. /load "src/**/*.js")');
  console.log('');
}

function showContext(agent) {
  const files = agent.context.getFiles();
  const changes = agent.context.getRecentChanges();
  console.log('\n' + chalk.blue.bold('Context:'));
  console.log('  Loaded files: ' + files.length);
  files.forEach((f) => console.log('    ' + f.path));
  console.log('  Recent changes: ' + changes.length);
  changes.slice(-5).forEach((c) => console.log('    ' + c.path + ' (' + (c.operation || 'modified') + ')'));
  console.log('');
}

async function runChat(options = {}) {
  const rootPath = process.cwd();
  const config = new Config(rootPath);
  await config.load();
  if (options.model) config.override({ ollama: { defaultModel: options.model } });

  const agent = new Agent(config);

  console.log(chalk.blue.bold('\nSaber Code Chat'));
  console.log(chalk.gray('Model: ' + config.ollama.defaultModel + '\n'));
  console.log(chalk.gray('Type "help" for commands, "quit" to exit.\n'));

  while (true) {
    const { userInput } = await inquirer.prompt([
      { type: 'input', name: 'userInput', message: chalk.green('You:') }
    ]);

    const input = (userInput || '').trim();
    if (['quit', 'exit', 'q'].includes(input.toLowerCase())) {
      console.log(chalk.blue('Goodbye.\n'));
      break;
    }

    if (!input) continue;

    if (input === 'help') {
      showHelp();
      continue;
    }

    if (input === 'context') {
      showContext(agent);
      continue;
    }

    if (input === 'clear') {
      agent.clearContext();
      console.log(chalk.yellow('Context cleared.\n'));
      continue;
    }

    if (input.startsWith('/load ')) {
      const raw = input.replace(/^\/load\s+/, '').trim();
      const patterns = raw ? raw.split(/\s+/) : [];
      if (!patterns.length) {
        console.log(chalk.yellow('Usage: /load <pattern> [pattern ...]>\n'));
        continue;
      }
      const spinner = createSpinner('Loading files...').start();
      try {
        const n = await loadFilesIntoAgent(agent, patterns, rootPath);
        spinner.succeed('Loaded ' + n + ' file(s) into context.');
      } catch (e) {
        spinner.fail(e.message);
      }
      continue;
    }

    try {
      process.stdout.write(chalk.blue('Assistant: '));

      const stream = options.stream !== false;
      const res = stream
        ? await agent.chat(input, { stream: true, model: options.model })
        : await agent.chat(input, { stream: false, model: options.model });

      if (stream && res && typeof res[Symbol.asyncIterator] === 'function') {
        for await (const { chunk } of res) {
          process.stdout.write(chunk);
        }
        console.log('\n');
      } else if (res && typeof res.content === 'string') {
        console.log(res.content + '\n');
      }
    } catch (e) {
      console.log('');
      console.error(chalk.red('Error: ' + e.message + '\n'));
    }
  }
}

module.exports = { runChat, loadFilesIntoAgent, showHelp, showContext };
