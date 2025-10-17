import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.(t|j)s',
    '!src/**/*.interface.(t|j)s',
    '!src/**/*.dto.(t|j)s',
    '!src/**/*.entity.(t|j)s',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  globalSetup: '<rootDir>/test/setup.ts',
  setupFilesAfterEnv: ['<rootDir>/test/jest-setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests serially to avoid database conflicts
  forceExit: true, // Force exit after all tests complete
  detectOpenHandles: false, // Don't detect open handles as it can cause issues on Windows
};

export default config;
