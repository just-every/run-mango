import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { deploymentSpec } from './delivery/base/spec.mjs';
import { packagingConfig } from './delivery/base/package.mjs';
import { loadSetupManifest } from './delivery/base/setup-manifest.mjs';

/** Publish the same recipe and setup identity used by Base's artifact producer. */
export async function syncIntegration(root = process.cwd(), write = false) {
  const config = JSON.parse(await readFile(resolve(root, 'scripts/delivery/base/packaging.json'), 'utf8'));
  const spec = await deploymentSpec(root, config.artifact.specInputs);
  const { project, setup } = packagingConfig(config);
  const selected = await loadSetupManifest(root, setup);
  const descriptor = { ...project, setup: { path: selected.path, sha256: selected.sha256 } };
  const outputs = [['management/integration/deployment-spec.json', spec], ['rer-project.json', descriptor]];
  for (const [name, value] of outputs) {
    const file = resolve(root, name), bytes = `${JSON.stringify(value, null, 2)}\n`;
    if (write) {
      await mkdir(resolve(file, '..'), { recursive: true });
      await writeFile(file, bytes);
    } else if (await readFile(file, 'utf8') !== bytes) {
      throw Error(`Stale ${name}; rebuild then run pnpm integration:sync.`);
    }
  }
  return spec;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3 || !['--check', '--write'].includes(process.argv[2])) throw Error('Use --check or --write.');
  await syncIntegration(process.cwd(), process.argv[2] === '--write');
  console.log('Integration deployment specification and setup identity match the Base build reader.');
}
