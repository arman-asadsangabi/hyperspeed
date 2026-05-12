import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { rm } from 'node:fs/promises'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

await build({
  entryPoints: [resolve(root, 'src/handler.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // Vercel's "Other" framework auto-discovers an entrypoint by searching for
  // app.{js,ts}, index.{js,ts}, server.{js,ts}, src/app.{js,ts}, ... in that
  // order. We output to index.js at the project root so it wins the search,
  // then nuke src/ to prevent the framework from grabbing src/handler.ts
  // first and breaking at runtime on bare-specifier imports.
  outfile: resolve(root, 'index.js'),
  conditions: ['node', 'import'],
  external: [],
  banner: {
    js: `import { createRequire as __cr } from 'module';
import { fileURLToPath as __fu } from 'url';
import { dirname as __dn } from 'path';
const require = __cr(import.meta.url);
const __filename = __fu(import.meta.url);
const __dirname = __dn(__filename);`,
  },
  logLevel: 'info',
})

if (process.env.VERCEL) {
  await rm(resolve(root, 'src'), { recursive: true, force: true })
  await rm(resolve(root, 'api'), { recursive: true, force: true })
  console.log('[bundle] cleaned src/ and api/ from deployment artifact')
}
