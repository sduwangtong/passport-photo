/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  // Only compile our utils — no RN/Expo source so we don't need a transform graph.
  transformIgnorePatterns: ['/node_modules/'],
  // Map any util that pulls expo-only deps to a manual mock if needed.
  moduleNameMapper: {
    '^expo-image-manipulator$': '<rootDir>/__tests__/__mocks__/expo-image-manipulator.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        // Loosen for tests so jest types work without polluting app tsconfig.
        types: ['jest', 'node'],
        strict: true,
        esModuleInterop: true,
        moduleResolution: 'node',
      },
    },
  },
};
