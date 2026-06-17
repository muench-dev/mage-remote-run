export default {
    transform: {},
    testEnvironment: 'node',
    clearMocks: true,
    forceExit: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: ['/examples/'],
    moduleFileExtensions: ['js', 'json'],
    testMatch: ['**/tests/**/*.test.js'],
    verbose: true
};
