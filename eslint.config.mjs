import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'dist-electron', 'release', 'node_modules', '93-media'] },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Renderer/main code intentionally uses `unknown` payloads at IPC and
      // persistence boundaries (see SettingsStore/WinnerStore/PlayStore) —
      // blanket-banning `any` there would force noisy casts with no real
      // safety gain over the existing runtime shape checks.
      '@typescript-eslint/no-explicit-any': 'off',
      // These two React-Compiler-oriented rules (new in eslint-plugin-react-hooks 7)
      // flag the lazy-ref-init (`if (!ref.current) ref.current = ...`) and
      // latest-closure-ref (`ref.current = { ...handlers }` during render, read
      // later in an event listener) idioms as errors. Both are React's own
      // documented patterns (see useGameEngine.ts and WinnerForm.tsx) and are used
      // here deliberately — useGameEngine's ref-guarded singleton init was a fix
      // for a real desync bug, not an oversight. Off rather than refactored.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/setupTests.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest } },
  },
  eslintConfigPrettier
);
