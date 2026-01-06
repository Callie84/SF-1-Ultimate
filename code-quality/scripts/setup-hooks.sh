#!/bin/bash
# ==========================================
# Git Hooks Setup Script
# ==========================================
# Installs and configures Git hooks with Husky
#
# Usage:
#   ./code-quality/scripts/setup-hooks.sh
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo -e "${BLUE}=========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}=========================================${NC}"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${YELLOW}→${NC} $1"
}

print_header "Git Hooks & Code Quality Setup"

# ==========================================
# 1. Check Prerequisites
# ==========================================
print_header "Checking Prerequisites"

if ! command -v node &> /dev/null; then
  print_error "Node.js not found"
  echo "Please install Node.js from https://nodejs.org/"
  exit 1
fi

print_success "Node.js $(node --version)"

if ! command -v npm &> /dev/null; then
  print_error "npm not found"
  exit 1
fi

print_success "npm $(npm --version)"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  print_error "Not a Git repository"
  exit 1
fi

print_success "Git repository detected"

echo ""

# ==========================================
# 2. Install Dependencies
# ==========================================
print_header "Installing Dependencies"

print_info "Installing code quality tools..."

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

if [ $? -eq 0 ]; then
  print_success "Dependencies installed"
else
  print_error "Failed to install dependencies"
  exit 1
fi

echo ""

# ==========================================
# 3. Initialize Husky
# ==========================================
print_header "Initializing Husky"

print_info "Setting up Husky..."

npx husky install

if [ $? -eq 0 ]; then
  print_success "Husky initialized"
else
  print_error "Failed to initialize Husky"
  exit 1
fi

# Add prepare script to package.json
npm pkg set scripts.prepare="husky install"
print_success "Added prepare script to package.json"

echo ""

# ==========================================
# 4. Make Hooks Executable
# ==========================================
print_header "Configuring Hooks"

print_info "Making hooks executable..."

chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
chmod +x .husky/pre-push

print_success "Hooks are now executable"

echo ""

# ==========================================
# 5. Add NPM Scripts
# ==========================================
print_header "Adding NPM Scripts"

# Check if scripts already exist
if ! grep -q "\"lint\":" package.json; then
  npm pkg set scripts.lint="eslint . --ext .ts,.tsx"
  print_success "Added lint script"
fi

if ! grep -q "\"lint:fix\":" package.json; then
  npm pkg set scripts.lint:fix="eslint . --ext .ts,.tsx --fix"
  print_success "Added lint:fix script"
fi

if ! grep -q "\"format\":" package.json; then
  npm pkg set scripts.format="prettier --write \"**/*.{ts,tsx,js,json,md}\""
  print_success "Added format script"
fi

if ! grep -q "\"format:check\":" package.json; then
  npm pkg set scripts.format:check="prettier --check \"**/*.{ts,tsx,js,json,md}\""
  print_success "Added format:check script"
fi

if ! grep -q "\"type-check\":" package.json; then
  npm pkg set scripts.type-check="tsc --noEmit"
  print_success "Added type-check script"
fi

echo ""

# ==========================================
# 6. Test Configuration
# ==========================================
print_header "Testing Configuration"

print_info "Testing ESLint..."
if npx eslint --version > /dev/null 2>&1; then
  print_success "ESLint is working"
else
  print_error "ESLint configuration issue"
fi

print_info "Testing Prettier..."
if npx prettier --version > /dev/null 2>&1; then
  print_success "Prettier is working"
else
  print_error "Prettier configuration issue"
fi

print_info "Testing commitlint..."
if echo "feat(test): test message" | npx commitlint > /dev/null 2>&1; then
  print_success "commitlint is working"
else
  print_error "commitlint configuration issue"
fi

echo ""

# ==========================================
# 7. Create VSCode Settings
# ==========================================
print_header "Creating VSCode Settings"

mkdir -p .vscode

cat > .vscode/settings.json << 'EOF'
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact"
  ],
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
EOF

print_success "Created .vscode/settings.json"

cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "editorconfig.editorconfig",
    "streetsidesoftware.code-spell-checker"
  ]
}
EOF

print_success "Created .vscode/extensions.json"

echo ""

# ==========================================
# Summary
# ==========================================
print_header "Setup Complete!"

echo ""
echo "✅ Git hooks installed and configured"
echo "✅ ESLint, Prettier, and commitlint ready"
echo "✅ VSCode settings configured"
echo ""
echo "📋 Available Commands:"
echo "  npm run lint           # Check for linting errors"
echo "  npm run lint:fix       # Fix linting errors"
echo "  npm run format         # Format code with Prettier"
echo "  npm run format:check   # Check code formatting"
echo "  npm run type-check     # Check TypeScript types"
echo ""
echo "🔒 Git Hooks:"
echo "  pre-commit   # Runs on: git commit"
echo "  commit-msg   # Validates commit message format"
echo "  pre-push     # Runs on: git push"
echo ""
echo "📚 Documentation:"
echo "  See code-quality/README.md for detailed usage"
echo ""
echo "🧪 Test the Setup:"
echo "  1. Make a change to a TypeScript file"
echo "  2. Run: git add ."
echo "  3. Run: git commit -m \"feat(test): test hooks\""
echo "  4. Hooks should run automatically!"
echo ""
echo "${GREEN}Happy coding! 🚀${NC}"
echo ""
