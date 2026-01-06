/**
 * Commitlint Configuration for SF-1 Ultimate
 *
 * Enforces Conventional Commits specification
 *
 * Format: <type>(<scope>): <subject>
 *
 * Example:
 *   feat(auth): add JWT refresh token rotation
 *   fix(prices): resolve race condition in scraper
 *   docs(api): update OpenAPI specification
 *
 * Usage:
 *   npx commitlint --edit <commit-msg-file>
 *
 * Documentation:
 *   https://www.conventionalcommits.org/
 *   https://commitlint.js.org/
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // ==========================================
    // Type
    // ==========================================
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'docs',      // Documentation changes
        'style',     // Code style changes (formatting, etc.)
        'refactor',  // Code refactoring
        'perf',      // Performance improvements
        'test',      // Adding or updating tests
        'build',     // Build system or external dependencies
        'ci',        // CI/CD changes
        'chore',     // Other changes (maintenance, etc.)
        'revert',    // Revert previous commit
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // ==========================================
    // Scope
    // ==========================================
    'scope-enum': [
      2,
      'always',
      [
        // Services
        'auth',
        'prices',
        'learn',
        'chat',
        'frontend',

        // Infrastructure
        'docker',
        'k8s',
        'nginx',
        'monitoring',
        'security',

        // General
        'api',
        'db',
        'deps',
        'config',
        'scripts',
        'tests',
        'docs',

        // Releases
        'release',
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],
    'scope-empty': [1, 'never'], // Warning, not error

    // ==========================================
    // Subject
    // ==========================================
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-min-length': [2, 'always', 10],
    'subject-max-length': [2, 'always', 100],

    // ==========================================
    // Header
    // ==========================================
    'header-max-length': [2, 'always', 120],

    // ==========================================
    // Body
    // ==========================================
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 120],

    // ==========================================
    // Footer
    // ==========================================
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 120],
  },

  // Custom validation functions
  plugins: [
    {
      rules: {
        // Custom rule: Check for issue references in breaking changes
        'breaking-change-issue': ({ header, body }) => {
          const hasBreakingChange = header.includes('!') ||
                                   (body && body.includes('BREAKING CHANGE:'));

          if (hasBreakingChange) {
            const hasIssueRef = (body && /(?:Closes|Fixes|Resolves) #\d+/i.test(body));

            if (!hasIssueRef) {
              return [
                false,
                'Breaking changes should reference an issue (e.g., "Closes #123")',
              ];
            }
          }

          return [true];
        },
      },
    },
  ],

  // Prompt configuration for interactive mode
  prompt: {
    questions: {
      type: {
        description: "Select the type of change you're committing:",
        enum: {
          feat: {
            description: 'A new feature',
            title: 'Features',
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
          },
          docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
          },
          style: {
            description: 'Code style changes (formatting, missing semicolons, etc.)',
            title: 'Styles',
          },
          refactor: {
            description: 'Code refactoring (neither fixes a bug nor adds a feature)',
            title: 'Code Refactoring',
          },
          perf: {
            description: 'Performance improvements',
            title: 'Performance',
          },
          test: {
            description: 'Adding missing tests or correcting existing tests',
            title: 'Tests',
          },
          build: {
            description: 'Changes to build system or external dependencies',
            title: 'Builds',
          },
          ci: {
            description: 'Changes to CI configuration files and scripts',
            title: 'Continuous Integration',
          },
          chore: {
            description: 'Other changes that don\'t modify src or test files',
            title: 'Chores',
          },
          revert: {
            description: 'Reverts a previous commit',
            title: 'Reverts',
          },
        },
      },
      scope: {
        description: 'What is the scope of this change (e.g. auth, prices)?',
      },
      subject: {
        description: 'Write a short, imperative tense description of the change',
      },
      body: {
        description: 'Provide a longer description of the change',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description: 'A BREAKING CHANGE commit requires a body. Please enter a longer description',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description: 'If issues are closed, the commit requires a body. Please enter a longer description',
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #456")',
      },
    },
  },
};
