const GLOB_PATTERNS = {
  JAVASCRIPT: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
  CONFIG: ['*.config.js', '*.config.ts', 'package.json', 'tsconfig.json', 'webpack.config.js'],
  DOCS: ['README.md', 'README.txt', '*.md', 'docs/**/*.md'],
  IGNORE: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
};

const FILE_EXTENSIONS = {
  CODE: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.rs'],
  CONFIG: ['.json', '.yaml', '.yml', '.toml', '.ini'],
  DOCS: ['.md', '.txt', '.rst']
};

const CODE_PATTERNS = {
  FUNCTION: /(function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>|class\s+\w+)/g,
  IMPORT: /(import\s+.*?from\s+['"][^'"]+['"]|require\s*\([^)]+\))/g,
  TODO: /\/\/\s*TODO:?.*|\/\*\s*TODO:?.*\*\//gi
};

module.exports = {
  GLOB_PATTERNS,
  FILE_EXTENSIONS,
  CODE_PATTERNS
};