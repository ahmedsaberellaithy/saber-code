# Publishing Guide - Saber Code CLI

Complete guide for preparing and publishing the package to npm.

---

## 📦 Package Configuration

### What Gets Published

The package is configured to include **only essential files**:

```json
"files": [
  "cli.js",        // CLI entry point
  "index.js",      // Module entry point
  "src/",          // All source code
  ".env.example",  // Environment template
  "README.md",     // Documentation
  "LICENSE"        // License file
]
```

### What Gets Excluded

All development and test files are excluded via `.npmignore`:

- ❌ `test/` - All test files
- ❌ `docs/` - Documentation (README.md included instead)
- ❌ `coverage/` - Test coverage reports
- ❌ `.env` - Local environment files
- ❌ Development configs
- ❌ Build artifacts

**Result**: Package size is **~30 KB** (compressed) vs **~1+ MB** (full repo)

---

## 🧪 Testing Before Publishing

### 1. Run All Tests

```bash
# Quick tests (component + unit)
npm test

# All tests including E2E
npm run test:all

# With coverage
npm run test:coverage
```

**Expected**: All 180 tests passing ✅

### 2. Check Package Contents

```bash
# Dry run to see what will be published
npm run package:check
```

**Output shows**:
- All files that will be included
- Package size (should be ~30 KB)
- Total file count (should be ~32 files)

### 3. Test Package Installation

**JavaScript Test**:
```bash
npm run test:package
```

**Bash Test**:
```bash
./test-package.sh
```

**What These Tests Do**:
1. Pack the package into a tarball
2. Create a temporary test directory
3. Install the package locally
4. Verify package structure
5. Test CLI commands (help, version)
6. Verify dependencies
7. Check package size
8. Test module importability
9. Clean up automatically

**Expected**: 6/6 tests passing ✅

---

## 📋 Pre-Publishing Checklist

Before publishing, ensure:

- [ ] All tests passing (`npm test`)
- [ ] Package test passing (`npm run test:package`)
- [ ] Version bumped in `package.json`
- [ ] `CHANGELOG.md` updated (if exists)
- [ ] `README.md` up to date
- [ ] No uncommitted changes
- [ ] On correct branch (main/master)
- [ ] `.env` not included (check `.npmignore`)
- [ ] Dependencies up to date
- [ ] No security vulnerabilities (`npm audit`)

---

## 🚀 Publishing Process

### First Time Setup

1. **Create npm account** (if you don't have one):
   ```bash
   npm adduser
   ```

2. **Login to npm**:
   ```bash
   npm login
   ```

3. **Verify login**:
   ```bash
   npm whoami
   ```

### Version Management

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

```bash
# Bump version
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

### Publishing

```bash
# Publish to npm
npm publish

# Publish as public package (if scoped)
npm publish --access public
```

### Post-Publishing

1. **Verify on npm**:
   ```
   https://www.npmjs.com/package/saber-code-cli
   ```

2. **Test installation**:
   ```bash
   npx saber-code@latest --version
   ```

3. **Tag release on GitHub**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

---

## 🔄 Automated Publishing Workflow

### Package Scripts

The `package.json` includes automated checks:

```json
{
  "scripts": {
    "prepublishOnly": "npm test",        // Auto-run before publish
    "test:package": "node test-package.js",
    "package:check": "npm pack --dry-run"
  }
}
```

**How it works**:
1. When you run `npm publish`
2. `prepublishOnly` runs automatically
3. Runs all tests
4. If tests fail, publish is aborted ✅

---

## 📊 Package Testing Details

### test-package.js (Node.js)

**Location**: `./test-package.js`

**What it tests**:
- ✅ Package creation (npm pack)
- ✅ Package installation in temp directory
- ✅ Package structure validation
- ✅ Required files present
- ✅ Excluded files absent
- ✅ CLI executable available
- ✅ CLI help command works
- ✅ CLI version command works
- ✅ All dependencies present
- ✅ Package size acceptable
- ✅ Module can be imported

**Run**:
```bash
npm run test:package
```

### test-package.sh (Bash)

**Location**: `./test-package.sh`

**Same tests as Node.js version**, but in pure Bash for systems where Node test might have issues.

**Run**:
```bash
./test-package.sh
```

**Both scripts**:
- Create temp directory automatically
- Clean up after themselves
- Exit with proper status codes
- Provide colored output
- Show detailed test summary

---

## 🛡️ Safety Features

### 1. prepublishOnly Hook

Automatically runs tests before publishing:

```json
"prepublishOnly": "npm test"
```

**Prevents** publishing broken code!

### 2. .npmignore

Excludes sensitive and unnecessary files:

```
test/
docs/
.env
coverage/
*.log
```

### 3. Package Test Scripts

Verify package works after installation:

```bash
npm run test:package  # Comprehensive checks
```

### 4. Dry Run

Preview what will be published:

```bash
npm run package:check  # No actual upload
```

---

## 🔍 Troubleshooting

### Issue: Package Too Large

**Check size**:
```bash
npm run package:check
```

**If over 1MB**:
1. Review `.npmignore`
2. Ensure `docs/` excluded
3. Ensure `test/` excluded
4. Check for large files: `du -sh * | sort -h`

### Issue: Tests Fail During Publish

```bash
# Run tests manually
npm test

# Check specific failures
npm run test:unit
npm run test:e2e
```

### Issue: Package Test Fails

```bash
# Run with verbose output
node test-package.js

# Check package contents
npm pack
tar -tzf saber-code-cli-*.tgz
```

### Issue: CLI Not Working After Install

```bash
# Verify bin field in package.json
npm pkg get bin

# Test locally
npm link
saber-code --help
```

### Issue: Missing Dependencies

```bash
# Check dependencies
npm ls

# Install missing deps
npm install

# Verify in package.json
npm pkg get dependencies
```

---

## 📝 Publishing Checklist

### Before Publishing

```bash
# 1. Update version
npm version patch  # or minor/major

# 2. Run all tests
npm test
npm run test:all

# 3. Test package
npm run test:package

# 4. Check contents
npm run package:check

# 5. Check for security issues
npm audit

# 6. Ensure clean git state
git status

# 7. Commit version bump
git add package.json
git commit -m "Bump version to X.X.X"
git push
```

### Publishing

```bash
# 1. Publish
npm publish

# 2. Verify on npm
open https://www.npmjs.com/package/saber-code-cli

# 3. Test installation
npx saber-code@latest --version

# 4. Tag release
git tag vX.X.X
git push origin vX.X.X
```

### After Publishing

```bash
# 1. Update documentation if needed
# 2. Announce on social media/changelog
# 3. Close related issues
# 4. Update project board
```

---

## 🎯 Best Practices

### Version Numbering

```
1.0.0 = Initial release
1.0.1 = Bug fix
1.1.0 = New feature (backward compatible)
2.0.0 = Breaking change
```

### Release Cadence

- **Patch**: As needed for bugs
- **Minor**: Monthly or when features ready
- **Major**: Yearly or for breaking changes

### Changelog

Keep a `CHANGELOG.md`:

```markdown
## [1.0.1] - 2026-01-22
### Fixed
- Bug in plan execution

## [1.0.0] - 2026-01-20
### Added
- Initial release
```

### Deprecation

When deprecating features:

```bash
# Mark version as deprecated
npm deprecate saber-code-cli@1.0.0 "Security issue, please upgrade"
```

---

## 📊 Package Statistics

**Current Configuration**:
- **Package Size**: ~30 KB (compressed)
- **Unpacked Size**: ~105 KB
- **Total Files**: 32
- **Dependencies**: 6 production deps
- **Dev Dependencies**: 1 (jest)

**Comparison**:
- **Full Repo**: ~1-2 MB (with tests, docs, coverage)
- **Published Package**: ~30 KB (80-90% smaller!)

---

## 🔗 Resources

- **npm Documentation**: https://docs.npmjs.com/
- **Semantic Versioning**: https://semver.org/
- **npm Package Best Practices**: https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry

---

## 📞 Support

If you encounter issues:

1. Check this guide
2. Run `npm run test:package`
3. Check package contents: `npm run package:check`
4. Review `.npmignore` and `package.json` "files" field
5. Test locally: `npm link`

---

**Last Updated**: January 22, 2026  
**Package Version**: 1.0.0  
**Status**: ✅ Ready for Publishing
