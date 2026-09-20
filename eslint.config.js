const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      '.agents/**',
      'dist/**',
      // The backend is a separate TypeScript project with its own compiler settings and
      // no React. It is typechecked by `npm run typecheck:backend`.
      'backend/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Routes are thin: composition only, no data access. AGENTS.md §4.1
    files: ['app/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message:
                'Routes must not access data directly. Use a hook from src/features/. AGENTS.md §4.1',
            },
          ],
          patterns: [
            {
              group: ['@/services/supabase*', '**/services/supabase*'],
              message:
                'Routes must not access data directly. Use a hook from src/features/. AGENTS.md §4.1',
            },
          ],
        },
      ],
    },
  },
];
