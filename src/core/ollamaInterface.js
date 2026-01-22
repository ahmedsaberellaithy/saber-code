const OllamaClient = require("./ollamaClient");
const ProjectContext = require("./projectContext");
const FileEditor = require("./fileEditor");
const path = require("path");

class OllamaInterface {
  constructor(options = {}) {
    this.ollama = new OllamaClient(
      options.baseURL || "http://localhost:11434",
      options.defaultModel || "codellama:13b"
    );
    this.projectContext = new ProjectContext(options.rootPath);
    this.fileEditor = new FileEditor(options.rootPath);
    this.defaultOptions = {
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 4096,
      top_p: options.top_p || 0.9,
    };

    // Claude-compatible API
    this.messages = {
      create: this.createMessage.bind(this),
    };
  }

  async initialize() {
    try {
      await this.projectContext.initialize();
      return this.projectContext.context;
    } catch (error) {
      console.warn("Initialization warning:", error.message);
      return this.projectContext.context;
    }
  }

  async createMessage(params) {
    const { messages, model, max_tokens, temperature, top_p, stream } = params;

    const systemPrompt = await this.projectContext.getSystemPrompt();
    const enhancedMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await this.ollama.chat(enhancedMessages, {
      model: model || this.ollama.defaultModel,
      max_tokens: max_tokens || this.defaultOptions.max_tokens,
      temperature: temperature || this.defaultOptions.temperature,
      top_p: top_p || this.defaultOptions.top_p,
      stream: stream || false,
    });

    const lastUserMessage = messages[messages.length - 1].content;
    this.projectContext.addToHistory("user", lastUserMessage);
    this.projectContext.addToHistory("assistant", response.content);

    const historyLength = this.projectContext.getConversationHistory().length;
    if (historyLength % 5 === 0) {
      try {
        await this.updateKnowledge();
      } catch (error) {
        console.warn("⚠️  Failed to update knowledge base:", error.message);
      }
    }

    return {
      id: `ollama-${Date.now()}`,
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: response.content }],
      model: response.model,
      stop_reason: "end_turn",
      usage: { input_tokens: 0, output_tokens: 0 },
    };
  }

  async complete(prompt, options = {}) {
    const response = await this.ollama.generate(prompt, {
      ...this.defaultOptions,
      ...options,
    });

    return {
      completion: response.content,
      model: response.model,
      stop_reason: "stop",
    };
  }

  async analyzeCode(filePath, model = this.ollama.defaultModel) {
    const fileContent = await this.projectContext.addFileToContext(filePath);
    const analysisPrompt = `Analyze this code file and provide:
1. Purpose and functionality
2. Key functions/classes
3. Potential issues or improvements
4. Dependencies and relationships

File: ${filePath}
Code:
\`\`\`
${fileContent.content}
\`\`\``;

    return this.createMessage({
      model: model,
      messages: [{ role: "user", content: analysisPrompt }],
      max_tokens: 2048,
    });
  }

  async getProjectSummary(model = this.ollama.defaultModel) {
    await this.projectContext.initialize();
    const summaryPrompt = `Provide a comprehensive project summary based on the project structure.

Please analyze:
1. Project type and technology stack
2. Key configuration and dependencies
3. Project structure insights
4. Potential setup or configuration issues
5. Recommendations for improvement`;

    return this.createMessage({
      model: model,
      messages: [{ role: "user", content: summaryPrompt }],
      max_tokens: 2048,
    });
  }

  async applyCodeChanges(editDescription, model = this.ollama.defaultModel) {
    // Get current project context to help with paths
    const context = this.getContext();
    const projectName =
      context.projectSummary?.projectName || "current directory";

    const editPrompt = `Based on this edit request: "${editDescription}"

IMPORTANT PATH INFORMATION:
- We are working in: ${process.cwd()}
- Project root: ${this.projectContext.rootPath}
- Current project: ${projectName}

Please provide specific file operations in JSON format. 

CRITICAL REQUIREMENTS:
1. Use ACTUAL file paths relative to project root, NOT placeholder paths like "path/to/file.js"
2. For files in the current directory, use just the filename (e.g., "README.md", "package.json")
3. For files in subdirectories, use relative paths (e.g., "src/cli.js", "config/settings.json")

Return ONLY valid JSON with this structure:
{
  "reasoning": "brief explanation of changes",
  "operations": [
    {
      "filePath": "ACTUAL_RELATIVE_PATH_HERE",
      "operation": "create|update|replace|insert|delete",
      "content": "full file content as string for create/update operations",
      "oldContent": "exact text to replace (for replace operation only)",
      "newContent": "exact replacement text (for replace operation only)", 
      "line": 10 (for insert operation only)
    }
  ]
}

OPERATION GUIDELINES:
- Use "create" for new files
- Use "update" only if you're sure the file exists and you're replacing ALL content
- Use "replace" for partial content changes in existing files
- Use "insert" for adding content at specific lines

Important: Return ONLY the JSON, no additional text or explanations.`;

    const response = await this.createMessage({
      model: model,
      messages: [{ role: "user", content: editPrompt }],
      temperature: 0.3,
      max_tokens: 4096,
    });

    // Parse the JSON response
    try {
      // Extract text from Claude-compatible response format
      const responseText = response?.content?.[0]?.text || response?.content || "";
      if (!responseText) {
        throw new Error("Empty response from AI");
      }
      console.log("🔍 Raw AI Response:", responseText);

      let jsonString = responseText;

      // Try to extract JSON if it's wrapped in text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonString = jsonMatch[0];

      // Clean up common issues
      jsonString = jsonString
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      console.log("🔍 Extracted JSON:", jsonString);

      const editPlan = JSON.parse(jsonString);
      const results = [];

      if (!editPlan.operations || !Array.isArray(editPlan.operations)) {
        throw new Error("Invalid operations array in AI response");
      }

      if (editPlan.operations.length === 0) {
        return {
          success: false,
          error: "AI returned empty operations array. Please be more specific in your edit request.",
          rawResponse: responseText,
          parsingError: false,
        };
      }

      // Fix path issues before processing
      for (const operation of editPlan.operations) {
        // Fix placeholder paths
        if (operation.filePath && operation.filePath.includes("path/to/")) {
          console.warn("⚠️  Fixing placeholder path:", operation.filePath);
          // Extract the filename from placeholder path
          const fileName = operation.filePath.split("/").pop();
          operation.filePath = fileName;
          console.log("✅ Fixed path to:", operation.filePath);
        }

        // For README.md in root, ensure correct path
        if (
          operation.filePath === "README.md" ||
          operation.filePath.includes("README.md")
        ) {
          operation.filePath = "README.md";
        }
      }

      for (const operation of editPlan.operations) {
        try {
          // Enhanced validation
          if (!operation.filePath || !operation.operation) {
            results.push({
              success: false,
              error: `Missing required fields: filePath or operation`,
              operation,
            });
            continue;
          }

          // Fix: Ensure content is a string, not an object
          if (operation.content && typeof operation.content !== "string") {
            console.warn(
              "⚠️  Content is not a string, converting:",
              typeof operation.content
            );
            operation.content = JSON.stringify(operation.content, null, 2);
          }

          // Smart operation selection based on file existence
          const fileExists = await this.fileEditor.fileExists(
            path.isAbsolute(operation.filePath)
              ? operation.filePath
              : path.join(this.projectContext.rootPath, operation.filePath)
          );

          // If file doesn't exist and operation is "update", change to "create"
          if (operation.operation === "update" && !fileExists) {
            console.warn(
              `⚠️  File ${operation.filePath} doesn't exist, changing operation from 'update' to 'create'`
            );
            operation.operation = "create";
          }

          // If file exists and operation is "create", change to "update"
          if (operation.operation === "create" && fileExists) {
            console.warn(
              `⚠️  File ${operation.filePath} already exists, changing operation from 'create' to 'update'`
            );
            operation.operation = "update";
          }

          // Validate operation requirements
          if (
            (operation.operation === "update" ||
              operation.operation === "create") &&
            (!operation.content || typeof operation.content !== "string")
          ) {
            results.push({
              success: false,
              error: `Missing or invalid content for ${operation.operation} operation. Content must be a string.`,
              operation,
            });
            continue;
          }

          if (
            operation.operation === "replace" &&
            (!operation.oldContent ||
              !operation.newContent ||
              typeof operation.oldContent !== "string" ||
              typeof operation.newContent !== "string")
          ) {
            results.push({
              success: false,
              error: `Missing or invalid oldContent/newContent for replace operation. Both must be strings.`,
              operation,
            });
            continue;
          }

          if (
            operation.operation === "insert" &&
            (operation.line === undefined || !operation.content)
          ) {
            results.push({
              success: false,
              error: `Missing line number or content for insert operation`,
              operation,
            });
            continue;
          }

          const result = await this.fileEditor.applyEdit(operation);

          if (result.success) {
            await this.projectContext.updateFileContext(
              operation.filePath,
              operation.operation,
              result
            );
          }

          results.push(result);
          // Note: updateFileContext already handles adding to recentChanges,
          // so we don't need to push here to avoid duplicates
        } catch (error) {
          const failedResult = {
            success: false,
            error: `Failed to apply operation on ${operation.filePath}: ${error.message}`,
            operation,
          };
          results.push(failedResult);
          
          // Track failed operations in recentChanges
          this.projectContext.context.recentChanges.push({
            operation,
            result: failedResult,
            timestamp: new Date(),
          });
        }
      }

      return {
        reasoning: editPlan.reasoning || "No reasoning provided",
        operations: results,
        success: results.every((r) => r.success !== false),
        rawResponse: responseText,
      };
    } catch (error) {
      console.error("❌ JSON Parse Error:", error.message);
      let rawResponseText = "No response available";
      
      if (response?.content?.[0]?.text) {
        rawResponseText = response.content[0].text;
      } else if (response?.content) {
        // If content is an array without text property, stringify it
        rawResponseText = typeof response.content === 'string' 
          ? response.content 
          : JSON.stringify(response.content);
      } else if (response?.content === undefined) {
        rawResponseText = "No response available";
      }
      
      console.error("📝 Raw Response:", rawResponseText);

      return {
        success: false,
        error: `Failed to parse AI response: ${error.message}`,
        rawResponse: rawResponseText,
        parsingError: true,
      };
    }
  }

  async searchCode(searchTerm, model = this.ollama.defaultModel) {
    const matches = await this.projectContext.searchAndAddFiles(searchTerm);
    const searchPrompt = `I found ${matches.length} files containing "${searchTerm}".

Please analyze the code patterns and provide:
1. Common usage patterns
2. Potential refactoring opportunities
3. Related functionality
4. Any issues or improvements needed`;

    return this.createMessage({
      model: model,
      messages: [{ role: "user", content: searchPrompt }],
      max_tokens: 2048,
    });
  }

  async updateKnowledge() {
    try {
      const knowledgeContent = await this.projectContext.updateKnowledgeBase();
      return {
        success: true,
        message: "Knowledge base updated",
        filePath: this.projectContext.knowledgeFile,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getKnowledge() {
    return await this.projectContext.loadKnowledge();
  }

  async loadFiles(filePatterns) {
    return await this.projectContext.addMultipleFiles(filePatterns);
  }

  async listModels() {
    return await this.ollama.listModels();
  }

  getContext() {
    return this.projectContext.context;
  }

  clearContext() {
    this.projectContext.clearContext();
  }

  async refreshKnowledge() {
    return await this.updateKnowledge();
  }

  async getModelInfo(modelName) {
    return await this.ollama.getModelInfo(modelName);
  }
}

module.exports = OllamaInterface;
