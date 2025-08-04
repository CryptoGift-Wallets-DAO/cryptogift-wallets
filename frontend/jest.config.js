/** @type {import('jest').Config} */
const config = {
  // Test environment
  testEnvironment: 'node',
  
  // Basic module file extensions
  moduleFileExtensions: ['js', 'jsx', 'json'],
  
  // Module name mapping for aliases and CSS/asset files (correct property name)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub'
  },
  
  // Test file patterns - only JS files for now
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.js',
    '<rootDir>/src/**/*.test.js',
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // Coverage configuration - only include files we want to test
  collectCoverageFrom: [
    'src/utils/*.{js,jsx}',
    '!src/test/**'
  ],
  
  // R3 QA REQUIREMENT: Coverage thresholds ≥95%
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,  
      lines: 95,
      statements: 95
    }
  },
  
  // Test timeout (important for blockchain operations)
  testTimeout: 30000,
  
  
  // Clear mocks between tests for isolation
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for CI
  verbose: process.env.CI === 'true',
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
    '<rootDir>/build/'
  ],
  
  // Module paths (for absolute imports)
  modulePaths: ['<rootDir>/src'],
  
  // Max workers for parallel test execution
  maxWorkers: process.env.CI ? 2 : '50%'
};

module.exports = config;