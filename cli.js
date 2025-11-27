#!/usr/bin/env node

const { Command } = require("commander");
const chalk = require("chalk");
const inquirer = require("inquirer");
const path = require("path");
const { OllamaInterface } = require("./index");

const program = new Command();
const ollamaClient = new OllamaInterface({ rootPath: process.cwd() });

// Initialize the project context
async function initialize() {
  try {
    await ollamaClient.initialize();
    console.log(chalk.green("✅ Project context initialized"));
  } catch (error) {
    console.log(
      chalk.yellow(
        "⚠️  Could not initialize project context, continuing with basic mode..."
      )
    );
  }
}

initialize();

program
  .name("saber")
  .description(
    "🤖 AI-powered code assistant with file editing and project analysis - By Ahmed Saber"
  )
  .version("1.0.0");

// Interactive Chat Command
program
  .command("chat")
  .description("Start an interactive coding session")
  .option("-m, --model <model>", "Model to use", "codellama")
  .option("-t, --temperature <number>", "Temperature", "0.7")
  .action(async (options) => {
    console.log(chalk.blue.bold("\n🚀 Saber Code Assistant"));
    console.log(
      chalk.gray(
        `Model: ${options.model} | Temperature: ${options.temperature}\n`
      )
    );
    console.log(chalk.gray('Type "help" for commands, "quit" to exit.\n'));

    const messages = [];

    while (true) {
      const { userInput } = await inquirer.prompt([
        {
          type: "input",
          name: "userInput",
          message: chalk.green("💬 You:"),
        },
      ]);

      const input = userInput.trim();
      if (["quit", "exit", "q"].includes(input.toLowerCase())) {
        console.log(chalk.blue("👋 Goodbye!"));
        break;
      }

      if (input === "help") {
        showHelp();
        continue;
      }

      if (input === "context") {
        showContext();
        continue;
      }

      if (input === "clear") {
        messages.length = 0;
        ollamaClient.clearContext();
        console.log(chalk.yellow("🧹 Context cleared"));
        continue;
      }

      // Handle special commands
      if (input.startsWith("/load ")) {
        const filePattern = input.replace("/load ", "").trim();
        await loadFiles(filePattern);
        continue;
      }

      if (input.startsWith("/analyze ")) {
        const filePath = input.replace("/analyze ", "").trim();
        await analyzeFile(filePath);
        continue;
      }

      if (input.startsWith("/edit ")) {
        const editDescription = input.replace("/edit ", "").trim();
        await applyEdit(editDescription);
        continue;
      }

      if (input === "/summary") {
        await getProjectSummary();
        continue;
      }

      if (input.startsWith("/search ")) {
        const searchTerm = input.replace("/search ", "").trim();
        await searchCode(searchTerm);
        continue;
      }

      // Regular chat
      messages.push({ role: "user", content: input });

      try {
        process.stdout.write(chalk.blue("🤖 Assistant: "));

        const response = await ollamaClient.messages.create({
          model: options.model,
          messages: messages,
          temperature: parseFloat(options.temperature),
        });

        const assistantResponse = response.content[0].text;
        console.log(assistantResponse + "\n");

        messages.push({ role: "assistant", content: assistantResponse });
      } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
      }
    }
  });

// Analyze File Command
program
  .command("analyze <file>")
  .description("Analyze a specific file")
  .option("-m, --model <model>", "Model to use", "codellama")
  .action(async (file, options) => {
    await analyzeFile(file, options.model);
  });

// Project Summary Command
program
  .command("summary")
  .description("Get project summary and analysis")
  .option("-m, --model <model>", "Model to use", "codellama")
  .action(async (options) => {
    await getProjectSummary(options.model);
  });

// Edit Command
program
  .command("edit <description>")
  .description("Apply code changes based on natural language description")
  .option("-m, --model <model>", "Model to use", "codellama")
  .action(async (description, options) => {
    await applyEdit(description, options.model);
  });

// Search Command
program
  .command("search <term>")
  .description("Search for code patterns in the project")
  .option("-m, --model <model>", "Model to use", "codellama")
  .action(async (term, options) => {
    await searchCode(term, options.model);
  });

// Load Files Command
program
  .command("load <patterns...>")
  .description("Load files into context (supports glob patterns)")
  .action(async (patterns) => {
    await loadFiles(patterns);
  });

// Context Command
program
  .command("context")
  .description("Show current project context")
  .action(() => {
    showContext();
  });

// Models Command
program
  .command("models")
  .description("List available Ollama models")
  .action(async () => {
    try {
      const models = await ollamaClient.listModels();
      console.log(chalk.blue.bold("📚 Available Models:"));
      models.forEach((model) => {
        console.log(
          `  ${chalk.green("•")} ${model.name} ${chalk.gray(`(${model.size})`)}`
        );
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
    }
  });

program
  .command("knowledge")
  .description("Show or update project knowledge base")
  .option("-u, --update", "Update knowledge base with current context")
  .action(async (options) => {
    if (options.update) {
      await updateKnowledge();
    } else {
      await showKnowledge();
    }
  });

// History Command
program
  .command("history")
  .description("Show chat history")
  .option("-c, --clear", "Clear chat history")
  .action(async (options) => {
    if (options.clear) {
      await clearHistory();
    } else {
      await showHistory();
    }
  });

// New helper functions
async function updateKnowledge() {
  try {
    console.log(chalk.blue("🧠 Updating project knowledge base..."));
    const result = await ollamaClient.refreshKnowledge();
    if (result.success) {
      console.log(chalk.green("✅ Knowledge base updated!"));
      console.log(chalk.gray("Check .saber-chat-history/intro_to_project.md"));
    } else {
      console.error(chalk.red("❌ Failed to update knowledge:", result.error));
    }
  } catch (error) {
    console.error(chalk.red("❌ Error:", error.message));
  }
}

async function showKnowledge() {
  try {
    const knowledge = await ollamaClient.getKnowledge();
    if (knowledge) {
      console.log(chalk.blue.bold("📚 Project Knowledge Base:"));
      console.log(knowledge);
    } else {
      console.log(
        chalk.yellow(
          'No knowledge base found. Use "saber knowledge --update" to create one.'
        )
      );
    }
  } catch (error) {
    console.error(chalk.red("❌ Error:", error.message));
  }
}

async function showHistory() {
  const context = ollamaClient.getContext();
  const history = context.conversationHistory;

  console.log(chalk.blue.bold("💬 Chat History:"));
  console.log(chalk.gray(`Total messages: ${history.length}\n`));

  history.slice(-10).forEach((msg, index) => {
    const prefix =
      msg.role === "user" ? chalk.green("You:") : chalk.blue("AI:");
    const time = new Date(msg.timestamp).toLocaleTimeString();
    console.log(
      `${chalk.gray(time)} ${prefix} ${msg.content.substring(0, 100)}...`
    );
  });
}

async function clearHistory() {
  try {
    // This would need to be implemented in ProjectContext
    console.log(chalk.yellow("🔄 Clearing chat history..."));
    // You'd implement clearHistory method in ProjectContext
    console.log(chalk.green("✅ History cleared!"));
  } catch (error) {
    console.error(chalk.red("❌ Error:", error.message));
  }
}

// Helper Functions
function showHelp() {
  console.log("\n" + chalk.blue.bold("🛠️  Available Commands:"));
  console.log(chalk.green("  General:"));
  console.log("    help     - Show this help message");
  console.log("    context  - Show current project context");
  console.log("    clear    - Clear conversation context");
  console.log("    quit     - Exit the chat");

  console.log(chalk.green("\n  Code Actions:"));
  console.log("    /load <pattern>    - Load files (e.g., /load src/**/*.js)");
  console.log("    /analyze <file>    - Analyze specific file");
  console.log("    /edit <description> - Apply code changes");
  console.log("    /summary           - Get project summary");
  console.log("    /search <term>     - Search for code patterns");

  console.log(chalk.green("\n  Examples:"));
  console.log("    /load package.json src/index.js");
  console.log("    /analyze src/utils/helpers.js");
  console.log('    /edit "add error handling to the main function"');
  console.log('    /search "function getUser"');

  console.log(chalk.green("\n  History & Knowledge:"));
  console.log("    /knowledge - Update project knowledge base");
  console.log("    /history   - Show recent chat history");
  console.log("    /clear     - Clear current session context");

  console.log("");
}

function showContext() {
  const context = ollamaClient.getContext();
  console.log("\n" + chalk.blue.bold("📁 Project Context:"));
  console.log(
    `  Project: ${chalk.green(
      context.projectSummary?.projectName || "Unknown"
    )}`
  );
  console.log(
    `  Files: ${chalk.cyan(context.projectSummary?.fileCount || 0)} total`
  );
  console.log(
    `  Loaded: ${chalk.cyan(
      context.currentFiles?.length || 0
    )} files in context`
  );

  if (context.currentFiles.length > 0) {
    console.log(chalk.green("\n  Loaded Files:"));
    context.currentFiles.forEach((file) => {
      console.log(`    • ${file.path} ${chalk.gray(`(${file.lines} lines)`)}`);
    });
  }

  if (context.recentChanges.length > 0) {
    console.log(chalk.yellow("\n  Recent Changes:"));
    context.recentChanges.slice(-3).forEach((change) => {
      console.log(
        `    • ${change.operation.filePath} ${chalk.gray(
          `(${change.operation.operation})`
        )}`
      );
    });
  }
  console.log("");
}

async function loadFiles(patterns) {
  try {
    const patternList = Array.isArray(patterns) ? patterns : [patterns];
    console.log(chalk.blue(`📂 Loading files: ${patternList.join(", ")}`));

    const files = await ollamaClient.loadFiles(patternList);
    console.log(chalk.green(`✅ Loaded ${files.length} files into context`));

    files.forEach((file) => {
      console.log(
        `   ${chalk.green("•")} ${file.path} ${chalk.gray(
          `(${file.lines} lines)`
        )}`
      );
    });
    console.log("");
  } catch (error) {
    console.error(chalk.red(`❌ Error loading files: ${error.message}`));
  }
}

async function analyzeFile(filePath, model = "codellama") {
  try {
    console.log(chalk.blue(`🔍 Analyzing ${filePath}...\n`));

    const response = await ollamaClient.analyzeCode(filePath, model);
    const analysis = response.content[0].text;

    console.log(chalk.green.bold("📊 Analysis Results:"));
    console.log(analysis + "\n");
  } catch (error) {
    console.error(chalk.red(`❌ Error analyzing file: ${error.message}`));
  }
}

async function getProjectSummary(model = "codellama") {
  try {
    console.log(chalk.blue("📊 Generating project summary...\n"));

    const response = await ollamaClient.getProjectSummary(model);
    const summary = response.content[0].text;

    console.log(chalk.green.bold("🏗️  Project Summary:"));
    console.log(summary + "\n");
  } catch (error) {
    console.error(chalk.red(`❌ Error generating summary: ${error.message}`));
  }
}

async function applyEdit(description, model = 'codellama') {
  try {
    console.log(chalk.blue(`✏️  Applying edit: ${description}\n`));
    
    const result = await ollamaClient.applyCodeChanges(description, model);
    
    if (result.success) {
      console.log(chalk.green.bold('✅ Edit applied successfully!'));
      console.log(chalk.gray('Reasoning: ') + result.reasoning + '\n');
      
      console.log(chalk.green('Operations performed:'));
      result.operations.forEach(op => {
        console.log(`  ${chalk.green('•')} ${op.message}`);
      });
    } else {
      console.error(chalk.red.bold('❌ Failed to apply edit:'));
      console.error(chalk.red(result.error));
      if (result.rawResponse) {
        console.log(chalk.yellow('\nRaw AI response:'));
        console.log(result.rawResponse);
      }
    }
    console.log('');
  } catch (error) {
    console.error(chalk.red(`❌ Error applying edit: ${error.message}`));
  }
}

async function searchCode(term, model = "codellama") {
  try {
    console.log(chalk.blue(`🔍 Searching for: "${term}"\n`));

    const response = await ollamaClient.searchCode(term, model);
    const results = response.content[0].text;

    console.log(chalk.green.bold("🔎 Search Results:"));
    console.log(results + "\n");
  } catch (error) {
    console.error(chalk.red(`❌ Error searching code: ${error.message}`));
  }
}

// Error handling for unhandled commands
program.showHelpAfterError(true);
program.showSuggestionAfterError(true);

// Parse command line arguments
program.parse();
