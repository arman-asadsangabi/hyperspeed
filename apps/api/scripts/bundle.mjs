/**
 * Bundle api/index.ts into a single self-contained ESM file so the Vercel
 * function loader doesn't have to resolve relative ../src/* imports at
 * runtime (which it can't, since Vercel only compiles files inside api/).
 *
 * All Node built-ins are preserved as externals. Everything else gets
 * inlined.
 */
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

await build({
  entryPoints: [resolve(root, 'src/handler.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: resolve(root, 'api/index.js'),
  // Mark node built-ins external so the runtime resolves them
  external: ['node:*'],
  banner: {
    // esbuild needs this shim to support __dirname / __filename in ESM
    // when bundled deps expect it (postgres, etc.).
    js: `import { createRequire as __cr } from 'module';
import { fileURLToPath as __fu } from 'url';
import { dirname as __dn } from 'path';
const require = __cr(import.meta.url);
const __filename = __fu(import.meta.url);
const __dirname = __dn(__filename);`,
  },
  logLevel: 'info',
})
