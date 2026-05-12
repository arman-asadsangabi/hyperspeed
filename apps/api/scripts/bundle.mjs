import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

await build({
  entryPoints: [resolve(root, 'src/handler.ts')],
  bundle: true,
  platform: 'browser',
  target: 'es2022',
  format: 'esm',
  outfile: resolve(root, 'api/index.js'),
  conditions: ['workerd', 'edge', 'browser', 'import'],
  external: [],
  logLevel: 'info',
})
