import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules', '.output', '.wxt', 'scripts', 'pages', 'styles'] },
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    rules: {
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-duplicates': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/page/**/*.ts', 'src/messaging/page/**/*.ts', 'src/entrypoints/page.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'Page bundle must stay React-free' },
            { group: ['@fluentui/*'], message: 'Page bundle must stay UI-free' },
            {
              group: ['wxt/browser', '#imports', 'wxt/utils/storage'],
              message: 'Page bundle runs without extension APIs',
            },
            {
              group: [
                '@/app',
                '@/app/*',
                '@/modules',
                '@/modules/*',
                '@/shared/components',
                '@/shared/components/*',
                '@/shared/storage',
                '@/shared/storage/*',
                '@/shared/stores',
                '@/shared/stores/*',
                '@/messaging/client',
                '@/messaging/client/*',
              ],
              message: 'Page bundle may only import contract, page, and pure shared code',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/background/**/*.ts', 'src/messaging/background/**/*.ts', 'src/entrypoints/background.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'Background bundle must stay React-free',
            },
            { group: ['@fluentui/*'], message: 'Background bundle must stay UI-free' },
            {
              group: [
                '@/app',
                '@/app/*',
                '@/modules',
                '@/modules/*',
                '@/page',
                '@/page/*',
                '@/shared/components',
                '@/shared/components/*',
                '@/messaging/client',
                '@/messaging/client/*',
              ],
              message: 'Background bundle may only import contract, background, storage, and pure shared code',
            },
          ],
        },
      ],
    },
  },
)
