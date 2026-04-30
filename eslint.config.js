import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.rules'],
    ...firebaseRulesPlugin.configs['flat/recommended'],
  },
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
];
