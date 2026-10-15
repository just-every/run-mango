import { readFile } from 'node:fs/promises';
import { writeGeneratedConfig } from './installer/write-generated-config.mjs';
await writeGeneratedConfig('wrangler.toml', await readFile('deploy/wrangler.local.template.toml', 'utf8'));
