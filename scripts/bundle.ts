/**
 * Bundles the parts of sagemath-ts we need into a single browser ESM module.
 *
 * sagemath-ts is not published to npm, so we build from the sibling checkout
 * and commit the result to vendor/ — the tutorial stays runnable on its own.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sageRoot =
  process.env.SAGEMATH_TS ?? join(root, '..', 'sagemath-ts');

if (!existsSync(join(sageRoot, 'packages/sagemath-ts/src/index.ts'))) {
  console.error(`Could not find sagemath-ts at ${sageRoot}`);
  console.error('Clone https://github.com/zksecurity/sagemath-ts next to this repo,');
  console.error('or set SAGEMATH_TS=/path/to/sagemath-ts');
  process.exit(1);
}

const result = await Bun.build({
  entrypoints: [join(root, 'scripts', 'sage-entry.ts')],
  outdir: join(root, 'vendor'),
  naming: 'sagemath.bundle.js',
  format: 'esm',
  target: 'browser',
  minify: false,
  define: { 'process.env.NODE_ENV': '"production"' },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const out = result.outputs[0]!;
console.log(`vendor/sagemath.bundle.js  (${(out.size / 1024).toFixed(0)} KB)`);
