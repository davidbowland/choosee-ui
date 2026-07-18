// Fleet ESLint flat config — UI (React / CRA / Next-style TypeScript) flavor.
// ESLint 9 + typescript-eslint 8 + eslint-plugin-react. Translated from the
// fleet's .eslintrc.json (food-ui / pick-a-time-ui) preserving original intent.
//
// This flavor intentionally does NOT include eslint-plugin-functional: React
// error boundaries MUST be class components, and this repo's eslintrc never
// enforced functional rules. Keep the functional mandate for UI in CLAUDE.md
// prose, not lint.
//
// Requires devDeps: eslint, @eslint/js, typescript-eslint, eslint-plugin-react,
//   eslint-plugin-jest, eslint-config-prettier, globals.
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jest from 'eslint-plugin-jest'
import react from 'eslint-plugin-react'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // 1) Build artifacts and generated files never linted. Mirrors the old
  //    .eslintignore (deploy/, static/, public/ carried forward even though
  //    deploy/ and static/ don't currently exist on disk — defensive, matches
  //    the fleet default for this flavor).
  {
    ignores: [
      '**/__mocks__/',
      '**/__snapshots__/',
      '.cache/',
      '.next/',
      '.swc/',
      'build/',
      'coverage/',
      'deploy/',
      'dist/',
      'node_modules/',
      'out/',
      'public/',
      'static/',
      'next-env.d.ts',
      '**/*.min.*',
      'jest.*.*',
    ],
  },

  // 2) Base recommended sets.
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,

  // 3) Language options + fleet rule intent (from food-ui / pick-a-time-ui).
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        exports: 'writable',
        module: 'readonly',
        require: 'readonly',
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // ignoreRestSiblings keeps the fleet's `{ field: _, ...rest }` drop-a-field
      // idiom clean; varsIgnorePattern alone does NOT cover destructured args.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '_', ignoreRestSiblings: true, varsIgnorePattern: '_' },
      ],
      'no-negated-condition': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-curly-brace-presence': ['error', { children: 'never', propElementValues: 'always', props: 'never' }],
      'react/jsx-sort-props': 'error',
      'sort-vars': 'error',
    },
  },

  // 4) Node scripts / config files may use CommonJS require() and Node globals.
  {
    files: ['scripts/**/*.js', '*.config.js', 'next.config.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // 5) Jest rules scoped to test / mock / test-support files only.
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*TestUtils.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      '**/__mocks__/**/*.{ts,tsx}',
    ],
    ...jest.configs['flat/recommended'],
    settings: { jest: { version: 29 } },
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'jest/no-mocks-import': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // 6) Prettier LAST — disables all formatting rules that would fight prettier.
  prettier,
)
