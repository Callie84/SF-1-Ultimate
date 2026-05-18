/**
 * ESLint Configuration for SF-1 Ultimate
 *
 * Comprehensive linting rules for TypeScript, Node.js, and React
 *
 * Features:
 * - TypeScript support with strict type checking
 * - React and React Hooks rules
 * - Security best practices
 * - Import/export validation
 * - Code quality enforcement
 *
 * Usage:
 *   npm run lint          # Check for errors
 *   npm run lint:fix      # Auto-fix errors
 */

module.exports = {
  root: true,

  // Parser for TypeScript
  parser: '@typescript-eslint/parser',

  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: ['./tsconfig.json', './apps/*/tsconfig.json'],
  },

  // Environments
  env: {
    node: true,
    es2022: true,
    jest: true,
  },

  // Plugins
  plugins: [
    '@typescript-eslint',
    'import',
    'security',
    'promise',
  ],

  // Extended configurations
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:security/recommended',
    'plugin:promise/recommended',
  ],

  // Rules
  rules: {
    // ==========================================
    // TypeScript Rules
    // ==========================================
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/require-await': 'warn',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false,
        },
      },
      {
        selector: 'typeAlias',
        format: ['PascalCase'],
      },
      {
        selector: 'enum',
        format: ['PascalCase'],
      },
    ],

    // ==========================================
    // Import/Export Rules
    // ==========================================
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-duplicates': 'error',
    'import/no-unused-modules': 'warn',
    'import/no-cycle': 'error',
    'import/no-unresolved': 'error',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/__tests__/**',
          '**/scripts/**',
        ],
      },
    ],

    // ==========================================
    // Security Rules
    // ==========================================
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-possible-timing-attacks': 'warn',

    // ==========================================
    // Promise Rules
    // ==========================================
    'promise/always-return': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-nesting': 'warn',
    'promise/no-return-wrap': 'error',

    // ==========================================
    // General Code Quality
    // ==========================================
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'no-param-reassign': 'error',
    'no-return-await': 'error',
    'require-await': 'off', // Using TS version
    'no-nested-ternary': 'warn',
    'no-unneeded-ternary': 'error',
    'no-duplicate-imports': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs'],
    'comma-dangle': ['error', 'always-multiline'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'max-len': [
      'warn',
      {
        code: 100,
        ignoreComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
    'max-lines': [
      'warn',
      {
        max: 500,
        skipBlankLines: true,
        skipComments: true,
      },
    ],
    'max-params': ['warn', 4],
    'complexity': ['warn', 15],

    // ==========================================
    // Best Practices
    // ==========================================
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-return-assign': 'error',
    'no-useless-return': 'error',
    'no-unreachable': 'error',
    'no-fallthrough': 'error',
    'default-case': 'error',
    'default-case-last': 'error',
    'no-else-return': 'error',
    'no-empty-function': 'warn',
    'no-implicit-coercion': 'error',
    'no-magic-numbers': [
      'warn',
      {
        ignore: [-1, 0, 1, 2, 100, 1000],
        ignoreArrayIndexes: true,
        enforceConst: true,
      },
    ],
  },

  // Overrides for specific file patterns
  overrides: [
    // React/Next.js files
    {
      files: ['*.tsx', '**/app/**/*.ts', '**/app/**/*.tsx'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
      ],
      plugins: ['react', 'react-hooks', 'jsx-a11y'],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off', // Next.js 13+ doesn't require this
        'react/prop-types': 'off', // Using TypeScript
        'react/jsx-props-no-spreading': 'warn',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },

    // Test files
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'max-lines': 'off',
        'no-magic-numbers': 'off',
      },
    },

    // Configuration files
    {
      files: ['*.config.js', '*.config.ts', '.eslintrc.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },

    // Scripts
    {
      files: ['scripts/**/*.ts', 'scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],

  // Import resolver settings
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.json', './apps/*/tsconfig.json'],
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },

  // Ignore patterns
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.next/',
    '*.min.js',
    '*.bundle.js',
  ],
};
