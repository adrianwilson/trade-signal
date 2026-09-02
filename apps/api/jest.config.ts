/**
 * @jest-config-loader-options {"transpileOnly":true,"compilerOptions":{"module":"CommonJS","moduleResolution":"node10","ignoreDeprecations":"6.0","rootDir":".","composite":false,"declaration":false,"emitDeclarationOnly":false,"declarationMap":false,"customConditions":null,"esModuleInterop":true}}
 */
export default {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@nestjs/typeorm|@nestjs/schedule|@nestjs/jwt|@nestjs/passport|typeorm)/)',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      lines: 70,
      branches: 70,
      functions: 70,
      statements: 70,
    },
  },
};
