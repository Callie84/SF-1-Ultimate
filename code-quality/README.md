# 🔧 Code Quality & Git Hooks

Comprehensive code quality setup with automated Git hooks, linting, formatting, and testing.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Git Hooks](#git-hooks)
- [ESLint Configuration](#eslint-configuration)
- [Prettier Configuration](#prettier-configuration)
- [Commit Message Standards](#commit-message-standards)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This project uses automated Git hooks to enforce code quality standards **before** code reaches the repository.

### What We Check

| Hook | Checks | Auto-fix |
|------|--------|----------|
| **pre-commit** | ESLint, Prettier, TypeScript, Tests | ✅ Yes |
| **commit-msg** | Conventional commits format | ❌ No |
| **pre-push** | Full test suite, builds | ❌ No |

### Benefits

- 🚀 **Catch errors early** - Before they reach CI/CD
- 🎨 **Consistent code style** - Automatic formatting
- 🧪 **Prevent broken code** - Tests run before push
- 📝 **Better commit history** - Standardized commit messages
- ⚡ **Fast feedback loop** - Immediate feedback on issues

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Husky and code quality tools
npm install --save-dev \
  husky \
  @commitlint/cli \
  @commitlint/config-conventional \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-import \
  eslint-plugin-security \
  eslint-plugin-promise \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-jsx-a11y \
  eslint-import-resolver-typescript \
  prettier \
  prettier-plugin-organize-imports
```

### 2. Initialize Husky

```bash
# Initialize Husky
npx husky install

# Set up Git hooks automatically on install
npm pkg set scripts.prepare="husky install"
```

### 3. Test the Setup

```bash
# Test ESLint
npm run lint

# Test Prettier
npm run format:check

# Test commit message
echo "feat(auth): add JWT refresh token rotation" | npx commitlint

# Make a test commit (hooks will run automatically)
git add .
git commit -m "feat(test): test Git hooks"
```

---

## 🔒 Git Hooks

### Pre-Commit Hook

**Runs before each commit**

```bash
.husky/pre-commit
```

**Checks:**
1. ✅ **ESLint** - Code linting
2. ✅ **Prettier** - Code formatting
3. ✅ **TypeScript** - Type checking
4. ✅ **Unit Tests** - Tests for changed files
5. ⚠️ **console.log** - Warns about console statements

**Example Output:**

```
🔍 Running pre-commit checks...

📝 Staged files:
  apps/auth-service/src/services/user.service.ts
  apps/auth-service/src/routes/auth.routes.ts

🔍 Running ESLint...
✓ ESLint passed

💅 Checking code formatting...
✓ Code formatting passed

📘 Running TypeScript type checking...
  Checking: apps/auth-service
✓ TypeScript check passed for apps/auth-service

🧪 Running unit tests for changed files...
✓ Unit tests passed

✅ All pre-commit checks passed!
```

**Auto-fix errors:**

```bash
# Fix ESLint errors
npm run lint:fix

# Fix Prettier errors
npm run format

# Skip hook (NOT recommended)
git commit --no-verify
```

### Commit Message Hook

**Validates commit message format**

```bash
.husky/commit-msg
```

**Format:** `<type>(<scope>): <subject>`

**Valid types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Tests
- `build` - Build system
- `ci` - CI/CD
- `chore` - Maintenance

**Examples:**

✅ **Good:**
```
feat(auth): add JWT refresh token rotation
fix(prices): resolve race condition in scraper
docs(api): update OpenAPI specification for v2
perf(db): add database connection pooling
```

❌ **Bad:**
```
added some stuff          # No type or scope
feat: Fix bug             # Subject should be lowercase
FIX(auth): broken login   # Type should be lowercase
feat(auth) add feature    # Missing colon
```

### Pre-Push Hook

**Runs before pushing to remote**

```bash
.husky/pre-push
```

**Checks:**
1. ✅ **Full test suite** - All tests must pass
2. ✅ **TypeScript compilation** - All services must compile
3. ⚠️ **Untracked files** - Warns about untracked files

**Example Output:**

```
🚀 Running pre-push checks...

🧪 Running full test suite...
✓ All tests passed

🔧 Running service-specific tests...
  Testing: auth-service
✓ Tests passed in auth-service
  Testing: price-service
✓ Tests passed in price-service

📘 Running TypeScript compilation...
  Compiling: auth-service
✓ TypeScript compilation passed in auth-service
  Compiling: price-service
✓ TypeScript compilation passed in price-service

✅ All pre-push checks passed!

Safe to push! 🚀
```

**Skip hook (NOT recommended):**

```bash
git push --no-verify
```

---

## 🔍 ESLint Configuration

### Overview

ESLint configuration in `.eslintrc.js` enforces:
- TypeScript best practices
- Import/export standards
- Security rules
- Code quality metrics

### Key Rules

```javascript
// TypeScript
'@typescript-eslint/no-explicit-any': 'warn'
'@typescript-eslint/no-floating-promises': 'error'
'@typescript-eslint/no-unused-vars': 'error'

// Imports
'import/order': 'error'  // Sorted imports
'import/no-cycle': 'error'  // No circular dependencies

// Security
'security/detect-eval-with-expression': 'error'
'security/detect-unsafe-regex': 'error'

// Code Quality
'complexity': ['warn', 15]  // Max cyclomatic complexity
'max-lines': ['warn', 500]  // Max lines per file
'max-params': ['warn', 4]   // Max function parameters
```

### Usage

```bash
# Check for errors
npm run lint

# Fix auto-fixable errors
npm run lint:fix

# Lint specific file
npx eslint src/services/user.service.ts

# Lint with specific config
npx eslint --config .eslintrc.js src/
```

### VSCode Integration

`.vscode/settings.json`:

```json
{
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Disabling Rules

```typescript
// Disable for single line
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = fetchData();

// Disable for block
/* eslint-disable @typescript-eslint/no-explicit-any */
function legacyCode() {
  const data: any = {};
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Disable for entire file
/* eslint-disable @typescript-eslint/no-explicit-any */
```

---

## 💅 Prettier Configuration

### Overview

Prettier configuration in `.prettierrc` enforces consistent code formatting.

### Settings

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "arrowParens": "always"
}
```

### Usage

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format

# Format specific file
npx prettier --write src/services/user.service.ts

# Format specific directory
npx prettier --write "apps/auth-service/src/**/*.ts"
```

### VSCode Integration

`.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Ignoring Files

`.prettierignore`:

```
node_modules/
dist/
.next/
coverage/
*.min.js
```

---

## 📝 Commit Message Standards

### Conventional Commits

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Components

**Type** (required):
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style
- `refactor` - Code refactoring
- `perf` - Performance
- `test` - Tests
- `build` - Build system
- `ci` - CI/CD
- `chore` - Maintenance

**Scope** (required):
- Service names: `auth`, `prices`, `learn`, `chat`, `frontend`
- Infrastructure: `docker`, `traefik`, `nginx`, `monitoring`, `security`
- General: `api`, `db`, `deps`, `config`, `scripts`, `tests`, `docs`

**Subject** (required):
- Lowercase, imperative mood
- 10-100 characters
- No period at the end

**Body** (optional):
- Detailed description
- Explain the "why" not the "what"
- Wrap at 120 characters

**Footer** (optional):
- Breaking changes: `BREAKING CHANGE: <description>`
- Issue references: `Closes #123`, `Fixes #456`

### Examples

**Feature:**
```
feat(auth): add JWT refresh token rotation

Implement automatic token rotation to improve security.
Tokens are now rotated every 15 minutes.

Closes #42
```

**Bug Fix:**
```
fix(prices): resolve race condition in scraper

The scraper was occasionally missing price updates due to
concurrent writes. Added proper locking mechanism.

Fixes #87
```

**Breaking Change:**
```
feat(api)!: change authentication endpoint to /v2/auth

BREAKING CHANGE: The /api/auth endpoint has been moved to
/api/v2/auth. Update all client applications.

Closes #123
```

**Documentation:**
```
docs(api): update OpenAPI specification for v2

Add new endpoints and deprecate old ones.
```

### Interactive Commit Prompt

```bash
# Use commitizen for interactive prompts
npx cz

# Or use git-cz
npm install -g git-cz
git cz
```

---

## 🔄 CI/CD Integration

### GitHub Actions

`.github/workflows/code-quality.yml`:

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint

  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
```

### Package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,json,md}\"",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prepare": "husky install"
  }
}
```

---

## 🐛 Troubleshooting

### Hook not running

**Problem:** Git hooks don't execute

**Solution:**
```bash
# Reinstall Husky
rm -rf .husky
npx husky install

# Make hooks executable
chmod +x .husky/*

# Check Git hooks directory
git config core.hooksPath
# Should output: .husky
```

### ESLint errors

**Problem:** ESLint shows errors but you disagree

**Solution:**
```bash
# Check specific rule
npx eslint --print-config src/file.ts

# Disable specific rule (use sparingly)
/* eslint-disable rule-name */

# Update .eslintrc.js to change rule severity
```

### Prettier conflicts

**Problem:** Prettier and ESLint conflict

**Solution:**
```bash
# Install ESLint-Prettier integration
npm install --save-dev eslint-config-prettier

# Update .eslintrc.js
{
  "extends": [
    "eslint:recommended",
    "prettier"  // Must be last
  ]
}
```

### Performance issues

**Problem:** Hooks are too slow

**Solution:**
```bash
# Run only on staged files (already implemented)
# Check what's taking time
time npm run lint

# Consider:
# - Disable slow rules
# - Use --cache flag for ESLint
# - Run fewer tests in pre-commit
```

### Commit message rejected

**Problem:** commitlint rejects valid message

**Solution:**
```bash
# Test commit message
echo "feat(auth): add feature" | npx commitlint

# Check config
npx commitlint --print-config

# Bypass (NOT recommended)
git commit --no-verify
```

### TypeScript errors in hooks

**Problem:** TypeScript compilation fails

**Solution:**
```bash
# Check TypeScript config
tsc --showConfig

# Fix errors
npm run type-check

# Check specific file
tsc --noEmit src/file.ts
```

---

## 📊 Code Quality Metrics

### Current Status

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test Coverage | >80% | 85% | ✅ |
| ESLint Errors | 0 | 0 | ✅ |
| TypeScript Errors | 0 | 0 | ✅ |
| Code Smells | <10 | 3 | ✅ |
| Security Issues | 0 | 0 | ✅ |

### Complexity Limits

```javascript
// Max cyclomatic complexity: 15
function complexFunction() {
  // If complexity > 15, ESLint will warn
}

// Max function parameters: 4
function manyParams(a, b, c, d, e) {
  // ESLint will warn (5 > 4)
}

// Max file lines: 500
// Files > 500 lines will trigger warning
```

### Import Organization

```typescript
// 1. Node.js built-ins
import fs from 'fs';
import path from 'path';

// 2. External dependencies
import express from 'express';
import { PrismaClient } from '@prisma/client';

// 3. Internal modules
import { UserService } from './services/user.service';
import { authMiddleware } from './middleware/auth.middleware';

// 4. Type imports
import type { User } from './types/user';
```

---

## 📚 Additional Resources

### Documentation

- [Conventional Commits](https://www.conventionalcommits.org/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Husky](https://typicode.github.io/husky/)
- [commitlint](https://commitlint.js.org/)

### VSCode Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "editorconfig.editorconfig",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

### Pre-commit Alternatives

If Husky doesn't work for your workflow:

- [pre-commit](https://pre-commit.com/) - Python-based
- [lefthook](https://github.com/evilmartians/lefthook) - Go-based
- [lint-staged](https://github.com/okonet/lint-staged) - Run on staged files only

---

## ✅ Checklist

Before pushing code:

- [ ] All tests pass locally
- [ ] No ESLint errors
- [ ] Code is formatted with Prettier
- [ ] TypeScript compiles without errors
- [ ] Commit messages follow conventional commits
- [ ] No `console.log` statements (use proper logger)
- [ ] No security vulnerabilities
- [ ] Code coverage >80%

---

## 🎯 Best Practices

### 1. Write Descriptive Commit Messages

```bash
# Bad
git commit -m "fix stuff"

# Good
git commit -m "fix(auth): resolve JWT token expiration bug

The token expiration check was incorrectly comparing timestamps.
Fixed by converting both values to milliseconds before comparison.

Fixes #123"
```

### 2. Keep Commits Atomic

- One logical change per commit
- Easy to review and revert
- Clear commit history

### 3. Run Tests Before Committing

```bash
# Run related tests
npm test -- --findRelatedTests src/services/user.service.ts

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### 4. Use Auto-fix Tools

```bash
# Fix most issues automatically
npm run lint:fix && npm run format
```

### 5. Review Changes Before Committing

```bash
# Check what you're committing
git diff --staged

# Interactive staging
git add -p
```

---

**Questions?** Check the [troubleshooting section](#troubleshooting) or open an issue.

**Need to skip hooks?** Use `--no-verify` flag (NOT recommended for production).

