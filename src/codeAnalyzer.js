const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

class CodeAnalyzer {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
    this.ignorePatterns = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.log',
      '**/coverage/**'
    ];
  }

  async getProjectStructure() {
    try {
      const files = await glob('**/*', {
        cwd: this.rootPath,
        ignore: this.ignorePatterns,
        nodir: true
      });

      const structure = {
        root: this.rootPath,
        fileCount: files.length,
        files: files.slice(0, 100), // Limit for large projects
        fileTypes: this.analyzeFileTypes(files)
      };

      return structure;
    } catch (error) {
      throw new Error(`Failed to analyze project structure: ${error.message}`);
    }
  }

  analyzeFileTypes(files) {
    const types = {};
    files.forEach(file => {
      const ext = path.extname(file) || 'no-extension';
      types[ext] = (types[ext] || 0) + 1;
    });
    return types;
  }

  async readFile(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.rootPath, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      return {
        path: filePath,
        content: content,
        lines: content.split('\n').length,
        size: content.length
      };
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  async readMultipleFiles(filePatterns) {
    const files = [];
    for (const pattern of filePatterns) {
      const matches = await glob(pattern, {
        cwd: this.rootPath,
        ignore: this.ignorePatterns
      });
      
      for (const match of matches) {
        try {
          const fileContent = await this.readFile(match);
          files.push(fileContent);
        } catch (error) {
          console.warn(`Skipping ${match}: ${error.message}`);
        }
      }
    }
    return files;
  }

  async findFilesByContent(searchTerm) {
    const allFiles = await glob('**/*', {
      cwd: this.rootPath,
      ignore: this.ignorePatterns,
      nodir: true
    });

    const matches = [];
    for (const file of allFiles.slice(0, 50)) { // Limit search for performance
      try {
        const content = await this.readFile(file);
        if (content.content.toLowerCase().includes(searchTerm.toLowerCase())) {
          matches.push({
            file: file,
            matches: content.content.split('\n').filter(line => 
              line.toLowerCase().includes(searchTerm.toLowerCase())
            ).length
          });
        }
      } catch (error) {
        // Skip unreadable files
      }
    }
    return matches;
  }

  async getProjectSummary() {
    const structure = await this.getProjectStructure();
    const packageJson = await this.getPackageJson();
    const configFiles = await this.findConfigFiles();

    return {
      projectName: packageJson.name || path.basename(this.rootPath),
      description: packageJson.description || '',
      fileCount: structure.fileCount,
      fileTypes: structure.fileTypes,
      dependencies: packageJson.dependencies ? Object.keys(packageJson.dependencies) : [],
      devDependencies: packageJson.devDependencies ? Object.keys(packageJson.devDependencies) : [],
      scripts: packageJson.scripts || {},
      configFiles: configFiles
    };
  }

  async getPackageJson() {
    try {
      const content = await this.readFile('package.json');
      return JSON.parse(content.content);
    } catch (error) {
      return {};
    }
  }

  async findConfigFiles() {
    const configPatterns = [
      'package.json',
      '*.config.js',
      '*.config.ts',
      '.env*',
      'tsconfig.json',
      'webpack.config.js',
      'dockerfile',
      'docker-compose.yml',
      'README.md'
    ];

    const files = [];
    for (const pattern of configPatterns) {
      const matches = await glob(pattern, { cwd: this.rootPath, nocase: true });
      files.push(...matches);
    }
    return files;
  }
}

module.exports = CodeAnalyzer;