module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Optimize performance during build
    'react-hooks/exhaustive-deps': 'warn',
  },
  // Speed up linting by ignoring certain patterns
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'public/',
    '*.config.js',
    '*.config.mjs',
    'coverage/',
    '.vercel/',
    '*.d.ts',
    'src/test/**/*'
  ],
  // Optimize parser options
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  }
};