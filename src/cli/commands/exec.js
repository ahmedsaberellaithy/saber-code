/**
 * Exec command: load plan and execute.
 */

const { Config, Agent, PlanManager } = require('../../core');
const { createSpinner, chalk } = require('../ui');

async function runExec(planPathOrOptions = null, options = {}) {
  const rootPath = process.cwd();
  const config = new Config(rootPath);
  await config.load();

  const agent = new Agent(config);
  const planManager = new PlanManager(config, agent);

  // Handle both: exec <path> and exec --continue-on-error
  let planPath = null;
  if (typeof planPathOrOptions === 'string') {
    planPath = planPathOrOptions;
  } else if (planPathOrOptions && typeof planPathOrOptions === 'object' && !Array.isArray(planPathOrOptions)) {
    // Options passed as first arg
    options = planPathOrOptions;
  }

  const loaded = await planManager.load(planPath);
  if (!loaded || !loaded.plan || !loaded.plan.steps || !loaded.plan.steps.length) {
    console.error(chalk.red('No plan found in _saber_code_plans/. Create one with: saber-code plan <goal>\n'));
    process.exitCode = 1;
    return;
  }

  const { plan, planPath: loadedPath } = loaded;
  console.log(chalk.blue.bold('Executing plan: ') + (plan.goal || ''));
  console.log(chalk.gray('File: ' + loadedPath + '\n'));

  const spinner = createSpinner('Running steps...').start();
  try {
    const result = await planManager.execute(loadedPath, { continueOnError: !!options.continueOnError });
    spinner.stop();

    const ok = result.results.filter((r) => r.ok).length;
    const fail = result.results.filter((r) => !r.ok);

    console.log(chalk.green('Completed: ' + ok + ' / ' + result.results.length) + ' steps.\n');

    if (fail.length) {
      console.log(chalk.red('Failed steps:'));
      fail.forEach((f) => console.log('  ' + (f.index + 1) + '. ' + f.tool + ': ' + f.error));
      console.log('');
      if (result.failedAt != null) process.exitCode = 1;
    }
  } catch (e) {
    spinner.fail(e.message);
    process.exitCode = 1;
  }
}

module.exports = { runExec };
