const { GLOB_PATTERNS, FILE_EXTENSIONS, CODE_PATTERNS } = require('../../src/utils/patterns');

describe('Patterns', () => {
  describe('GLOB_PATTERNS', () => {
    test('should have JAVASCRIPT patterns', () => {
      expect(GLOB_PATTERNS.JAVASCRIPT).toContain('**/*.js');
      expect(GLOB_PATTERNS.JAVASCRIPT).toContain('**/*.jsx');
      expect(GLOB_PATTERNS.JAVASCRIPT).toContain('**/*.ts');
      expect(GLOB_PATTERNS.JAVASCRIPT).toContain('**/*.tsx');
    });

    test('should have CONFIG patterns', () => {
      expect(GLOB_PATTERNS.CONFIG).toContain('*.config.js');
      expect(GLOB_PATTERNS.CONFIG).toContain('package.json');
      expect(GLOB_PATTERNS.CONFIG).toContain('tsconfig.json');
    });

    test('should have DOCS patterns', () => {
      expect(GLOB_PATTERNS.DOCS).toContain('README.md');
      expect(GLOB_PATTERNS.DOCS).toContain('*.md');
      expect(GLOB_PATTERNS.DOCS).toContain('docs/**/*.md');
    });

    test('should have IGNORE patterns', () => {
      expect(GLOB_PATTERNS.IGNORE).toContain('**/node_modules/**');
      expect(GLOB_PATTERNS.IGNORE).toContain('**/.git/**');
      expect(GLOB_PATTERNS.IGNORE).toContain('**/dist/**');
    });
  });

  describe('FILE_EXTENSIONS', () => {
    test('should have CODE extensions', () => {
      expect(FILE_EXTENSIONS.CODE).toContain('.js');
      expect(FILE_EXTENSIONS.CODE).toContain('.ts');
      expect(FILE_EXTENSIONS.CODE).toContain('.py');
      expect(FILE_EXTENSIONS.CODE).toContain('.java');
      expect(FILE_EXTENSIONS.CODE).toContain('.go');
    });

    test('should have CONFIG extensions', () => {
      expect(FILE_EXTENSIONS.CONFIG).toContain('.json');
      expect(FILE_EXTENSIONS.CONFIG).toContain('.yaml');
      expect(FILE_EXTENSIONS.CONFIG).toContain('.yml');
    });

    test('should have DOCS extensions', () => {
      expect(FILE_EXTENSIONS.DOCS).toContain('.md');
      expect(FILE_EXTENSIONS.DOCS).toContain('.txt');
    });
  });

  describe('CODE_PATTERNS', () => {
    describe('FUNCTION pattern', () => {
      test('should match function declarations', () => {
        const code = 'function myFunction() {}';
        expect(code.match(CODE_PATTERNS.FUNCTION)).toBeTruthy();
      });

      test('should match arrow functions', () => {
        const code = 'const myFunc = () => {}';
        expect(code.match(CODE_PATTERNS.FUNCTION)).toBeTruthy();
      });

      test('should match class declarations', () => {
        const code = 'class MyClass {}';
        expect(code.match(CODE_PATTERNS.FUNCTION)).toBeTruthy();
      });

      test('should match multiple functions', () => {
        const code = 'function func1() {} const func2 = () => {}';
        const matches = code.match(CODE_PATTERNS.FUNCTION);
        expect(matches).toHaveLength(2);
      });
    });

    describe('IMPORT pattern', () => {
      test('should match ES6 import statements', () => {
        const code = 'import express from "express"';
        expect(code.match(CODE_PATTERNS.IMPORT)).toBeTruthy();
      });

      test('should match require statements', () => {
        const code = 'const express = require("express")';
        expect(code.match(CODE_PATTERNS.IMPORT)).toBeTruthy();
      });

      test('should match named imports', () => {
        const code = 'import { func1, func2 } from "./module"';
        expect(code.match(CODE_PATTERNS.IMPORT)).toBeTruthy();
      });

      test('should match default and named imports', () => {
        const code = 'import defaultExport, { named } from "module"';
        expect(code.match(CODE_PATTERNS.IMPORT)).toBeTruthy();
      });
    });

    describe('TODO pattern', () => {
      test('should match single-line TODO comments', () => {
        const code = '// TODO: Fix this bug';
        expect(code.match(CODE_PATTERNS.TODO)).toBeTruthy();
      });

      test('should match TODO without colon', () => {
        const code = '// TODO Fix this';
        expect(code.match(CODE_PATTERNS.TODO)).toBeTruthy();
      });

      test('should match multi-line TODO comments', () => {
        const code = '/* TODO: Implement feature */';
        expect(code.match(CODE_PATTERNS.TODO)).toBeTruthy();
      });

      test('should be case insensitive', () => {
        const code = '// todo: lowercase';
        expect(code.match(CODE_PATTERNS.TODO)).toBeTruthy();
      });

      test('should match multiple TODOs', () => {
        const code = '// TODO: First\n// TODO: Second';
        const matches = code.match(CODE_PATTERNS.TODO);
        expect(matches).toHaveLength(2);
      });
    });
  });

  describe('pattern exports', () => {
    test('should export all pattern objects', () => {
      expect(GLOB_PATTERNS).toBeDefined();
      expect(FILE_EXTENSIONS).toBeDefined();
      expect(CODE_PATTERNS).toBeDefined();
    });

    test('should have correct object structure', () => {
      expect(typeof GLOB_PATTERNS).toBe('object');
      expect(typeof FILE_EXTENSIONS).toBe('object');
      expect(typeof CODE_PATTERNS).toBe('object');
    });
  });
});

