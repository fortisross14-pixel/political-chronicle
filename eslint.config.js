// ESLint flat config: TypeScript + React hooks; formatting is Prettier's job.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/ui/**', 'react', 'react-dom'], message: 'The engine and data layers must not import UI code or React.' },
          ],
        },
      ],
    },
  },
  {
    // Plain Node scripts and config files.
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // The UI may import anything; only engine/data/sim/storage are restricted above.
    files: ['src/ui/**', 'src/main.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  prettier,
);
