#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const {
  runChat,
  runPlan,
  runExec,
  runListPlans,
  runSearch,
  runAnalyze,
  runModels
} = require('./src/cli');

const program = new Command();

program
  .name('saber-code')
  .description('CLI for Ollama: batch context, plan, implement, and quick tasks')
  .version('1.0.0');

program
  .command('chat')
  .description('Interactive chat with streaming output')
  .option('-m, --model <model>', 'Ollama model', 'codellama:13b')
  .option('--no-stream', 'Disable streaming')
  .action(async (options) => {
    try {
      await runChat({ model: options.model, stream: options.stream });
    } catch (e) {
      console.error(chalk.red('Error: ' + e.message));
      process.exitCode = 1;
    }
  });

program
  .command('plan <goal>')
  .description('Batch context, build plan, and optionally execute')
  .option('-m, --model <model>', 'Ollama model', 'codellama:13b')
  .option('-l, --load <patterns...>', 'Glob patterns to load into context')
  .option('-e, --execute', 'Execute plan after creating')
  .option('-y, --yes', 'Skip confirmation when executing')
  .option('--continue-on-error', 'Continue plan execution on step failure')
  .action(async (goal, options) => {
    try {
      await runPlan(goal, {
        model: options.model,
        load: options.load,
        execute: options.execute,
        yes: options.yes,
        continueOnError: options.continueOnError
      });
    } catch (e) {
      console.error(chalk.red('Error: ' + e.message));
      process.exitCode = 1;
    }
  });

program
  .command('exec [plan-path]')
  .description('Execute a plan (latest if no path provided)')
  .option('--continue-on-error', 'Continue on step failure')
  .action(async (planPath, options) => {
    try {
      await runExec(planPath, { continueOnError: options.continueOnError });
    } catch (e) {
      console.error(chalk.red('Error: ' + e.message));
      process.exitCode = 1;
    }
  });

program
  .command('search <term>')
  .description('Search for pattern in files (grep-like)')
  .option('-g, --glob <pattern>', 'File glob', '**/*')
  .option('-n, --max-results <n>', 'Max matches', '50')
  .option('--limit <n>', 'Max lines to show', '30')
  .action(async (term, options) => {
    try {
      await runSearch(term, {
        glob: options.glob,
        maxResults: parseInt(options.maxResults, 10) || 50,
        limit: parseInt(options.limit, 10) || 30
      });
    } catch (e) {
      console.error(chalk.red('Error: ' + e.message));
      process.exitCode = 1;
    }
  });

program
  .command('analyze <file>')
  .description('Analyze a file with AI')
  .option('-m, --model <model>', 'Ollama model', 'codellama:13b')
  .action(async (file, options) => {
    try {
      await runAnalyze(file, { model: options.model });
    } catch (e) {
      console.error(chalk.red('Error: ' + e.message));
      process.exitCode = 1;
    }
  });

program
  .command('models')
  .description('List available Ollama models')
  .action(async () => {
    try {
      await runModels();
    } catch (e) {
      process.exitCode = 1;
    }
  });

program
  .command('plans')
  .description('List all saved plans')
  .action(async () => {
    try {
      await runListPlans();
    } catch (e) {
      console.error(chalk.red('Error: ' + e.message));
      process.exitCode = 1;
    }
  });

program.parse();
