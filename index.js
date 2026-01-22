/**
 * Saber Code CLI - exports for programmatic use.
 */

const {
  Config,
  OllamaClient,
  TokenCounter,
  ContextManager,
  Agent,
  PlanManager
} = require('./src/core');

const {
  ui,
  runChat,
  runPlan,
  runExec,
  runSearch,
  runAnalyze,
  runModels
} = require('./src/cli');

const { createRegistry, BUILTINS } = require('./src/tools');

module.exports = {
  Config,
  OllamaClient,
  TokenCounter,
  ContextManager,
  Agent,
  PlanManager,
  createRegistry,
  BUILTINS,
  ui,
  runChat,
  runPlan,
  runExec,
  runSearch,
  runAnalyze,
  runModels
};
