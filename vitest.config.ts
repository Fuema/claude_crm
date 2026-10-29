import viteReact from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts: tests run in Node/jsdom, not in workerd.
// Vitest runs on Node, which does not read `.env` by itself.
const env = loadEnv('test', process.cwd(), '')

const WASM_MODULE_SUFFIX = '.wasm?module'

/**
 * The Prisma client is generated for Workers, where `import x from
 * './file.wasm?module'` yields a compiled WebAssembly.Module. Node has no such
 * import, so tests compile the file the same way.
 */
function wasmModuleImports(): Plugin {
  return {
    name: 'wasm-module-imports',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith(WASM_MODULE_SUFFIX)) {
        return null
      }
      const file = id.slice(0, -'?module'.length)
      return [
        "import { readFileSync } from 'node:fs'",
        `export default new WebAssembly.Module(readFileSync(${JSON.stringify(file)}))`,
      ].join('\n')
    },
  }
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [wasmModuleImports(), viteReact()],
  test: {
    globals: true,
    env: { TEST_DATABASE_URL: env.TEST_DATABASE_URL ?? '' },
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: [
            'src/server/**/*.test.ts',
            'src/features/*/server/**/*.test.ts',
          ],
          setupFiles: ['src/tests/setup-server.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [
            'src/server/**',
            'src/features/*/server/**',
            'src/tests/e2e/**',
          ],
          setupFiles: ['src/tests/setup-client.ts'],
        },
      },
    ],
  },
})
