import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['.*\\.d\\.ts', 'config/*', 'types.ts', 'pages/_app.tsx', 'pages/_document.tsx'],
  coverageThreshold: {
    global: { branches: 80, functions: 90, lines: 80 },
  },
  moduleNameMapper: {
    '.+\\.(css|styl|less|sass|scss)$': 'identity-obj-proxy',
    '.+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|pdf|yaml)$':
      '<rootDir>/__mocks__/file-mock.js',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@fontsource(-variable)?/(.*)$': '<rootDir>/__mocks__/file-mock.js',
    '^@heroui/react$': '<rootDir>/node_modules/@heroui/react/dist/index.js',
    '^@heroui/styles$': '<rootDir>/node_modules/@heroui/styles/dist/index.js',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@types$': '<rootDir>/src/types',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  setupFiles: ['<rootDir>/jest.polyfills.js', '<rootDir>/jest.setup-test-env.js'],
  testEnvironment: 'jsdom',
  // HeroUI form components legitimately take 3-5s per interaction-heavy test. Jest's 5s default
  // leaves no margin, so tests time out whenever the machine is under load.
  testTimeout: 30_000,
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  // `.worktrees/` holds linked git worktrees, each a full copy of the repo including its tests.
  // Without this, a run from the main tree discovers those copies and executes them against the
  // MAIN tree's src — moduleNameMapper resolves @components/* etc. to <rootDir> regardless of which
  // worktree the test file came from — so an in-progress branch's tests get graded against another
  // branch's source. Every failure that produces is a phantom.
  // Keeps worktree copies out of the module map as well as out of test discovery. Each worktree
  // carries its own `__mocks__/file-mock.js`, and duplicates in the haste map make jest warn and
  // then resolve a manual mock from whichever copy it saw first.
  // `.claude/worktrees/` is where the agent harness puts worktrees; `.worktrees/` is the manual
  // convention. Both need excluding for the reason above, and missing the first one is silent:
  // TypeScript's wildcard globs skip dot-directories so `npm run typecheck` never noticed, while
  // jest happily discovered 75 worktree copies and graded them against this tree's src.
  modulePathIgnorePatterns: ['<rootDir>/.worktrees/', '<rootDir>/.claude/worktrees/'],
  testPathIgnorePatterns: [
    'node_modules',
    '\\.cache',
    '<rootDir>.*/out',
    '<rootDir>/.worktrees/',
    '<rootDir>/.claude/worktrees/',
  ],
}

// next/jest prepends its own transformIgnorePatterns that block all node_modules.
// We override them after resolution to allow ESM packages to be transformed.
// If tests fail with "SyntaxError: Unexpected token 'export'", add the failing package name here.
const esmPackages = [
  'uuid',
  '@heroui',
  'tailwind-variants',
  '@jridgewell',
  '@react-aria',
  '@react-stately',
  '@react-types',
  'react-aria-components',
  '@internationalized',
  'input-otp',
  '@radix-ui',
  'tailwind-merge',
  'dedent',
  'embla-carousel',
].join('|')

const baseCreateJestConfig = createJestConfig(config)

export default async function jestConfig() {
  const resolvedConfig = await baseCreateJestConfig()
  return {
    ...resolvedConfig,
    transformIgnorePatterns: [`/node_modules/(?!(${esmPackages})/)`, '^.+\\.module\\.(css|sass|scss)$'],
  }
}
