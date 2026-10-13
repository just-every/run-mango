import { copyFile } from 'node:fs/promises';
await copyFile('deploy/wrangler.local.template.toml', 'wrangler.toml');
