import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Test harness for the amir-site suite. jsdom environment so component tests
// (Testing Library) work; pure-logic tests run fine under it too. The `@/`
// path alias is resolved from tsconfig via vite-tsconfig-paths.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'lib/**/*.test.{ts,tsx}',
      'components/**/*.test.{ts,tsx}',
      'scripts/**/*.test.{ts,mts}',
      'app/**/*.test.{ts,tsx}',
    ],
    exclude: ['node_modules', '.next', 'public', 'e2e'],
  },
})
