import {readFile} from 'node:fs/promises';
import {produceSeedArtifact} from './delivery/base/package.mjs';
const config = JSON.parse(await readFile(new URL('../packaging.json', import.meta.url), 'utf8'));
console.log(JSON.stringify(await produceSeedArtifact({config})));
