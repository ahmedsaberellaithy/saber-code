/**
 * CLI layer - commands and UI
 */

const ui = require('./ui');
const { runChat, showHelp, showContext } = require('./commands/chat');
const { runPlan } = require('./commands/plan');
const { runExec } = require('./commands/exec');
const { runSearch, runAnalyze, runModels } = require('./commands/quick');

module.exports = {
  ui,
  runChat,
  showHelp,
  showContext,
  runPlan,
  runExec,
  runSearch,
  runAnalyze,
  runModels
};
