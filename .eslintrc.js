module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'semi': 'off',
    'prefer-const': 'warn',
    'import/extensions': 'off',
    'no-plusplus': ['error', { 'allowForLoopAfterthoughts': true }],
    'no-use-before-define': 'warn',
    'no-unused-vars': 'warn',
    'no-nested-ternary': 'warn',
    'import/no-unresolved': 'warn',
    'indent': 'warn',
    'prefer-template': 'warn',
    'no-param-reassign': 'warn',
    'object-curly-newline': 'warn',
    'arrow-body-style': 'warn',
  },
};
