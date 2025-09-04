module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
    extraFileExtensions: ['.vue'],
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'vue/multi-word-component-names': 'off',
    // Prefer TS-aware unused vars rule
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Pragmatic defaults for mixed TS/Vue codebase
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-undef': 'off',
    'vue/no-mutating-props': 'warn',
    'no-control-regex': 'warn',
    'no-useless-escape': 'warn',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.d.ts'],
}
