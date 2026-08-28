/**
 * @jest-config-loader-options {"transpileOnly":true,"compilerOptions":{"module":"CommonJS","moduleResolution":"node10","ignoreDeprecations":"6.0","rootDir":".","composite":false,"declaration":false,"emitDeclarationOnly":false,"declarationMap":false,"customConditions":null,"esModuleInterop":true}}
 */
export default {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
};
