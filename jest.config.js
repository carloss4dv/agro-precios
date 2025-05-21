/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./test/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  testMatch: [
    '**/test/**/*.test.ts',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    '**/src/**/*.ts',
    '!**/node_modules/**',
  ],
  verbose: true
};
