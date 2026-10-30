import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Removes only rebuildable Vinext/Next generated files, never user data or Wrangler state.
const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
for (const name of ['.next', '.vinext']) {
  const target = resolve(frontendRoot, name);
  rmSync(target, { recursive: true, force: true });
  console.log('Cleared dev build cache:', name);
}
