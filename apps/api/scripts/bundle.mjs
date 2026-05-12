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
  outfile: resolve(root, 'api/index.js'),
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

// Vercel auto-discovers src/handler.ts as a phantom function entry alongside
// our bundled api/index.js, which then breaks at runtime because src/*.ts
// imports use bare specifiers (no .js extension). The bundle is fully
// self-contained, so we wipe src/ post-build to prevent the auto-discovery.
if (process.env.VERCEL) {
  await rm(resolve(root, 'src'), { recursive: true, force: true })
  console.log('[bundle] cleaned src/ from deployment artifact')
}
