import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** deploy.json may mark a secret `"optional": true`: the input of an optional module, such as the design module's
 * 12ui key and origin (DESIGN-001), which stays off unless the owner sets it. The rer deploy kit uploads every
 * secret a declaration lists and requires its input on a first deploy, so Mango hands the kit a declaration of the
 * required secrets plus the optional ones whose environment input is set (`deploy`), or of the required ones only
 * (the hosted check of `verify`, which serves the build without optional modules). Each is written under .rer/,
 * which Git ignores, and holds names only, never a value. */
export const declarationPaths = { deploy: '.rer/declarations/deploy.json', verify: '.rer/declarations/verify.json' };

export function resolveDeclaration(root, purpose, env = {}) {
  const declaration = JSON.parse(readFileSync(join(root, 'deploy.json'), 'utf8'));
  const supplied = item => typeof env[item.environment] === 'string' && env[item.environment].trim() !== '';
  if (purpose === 'deploy') {
    for (const pair of [['DESIGN_PROVIDER_API_KEY', 'DESIGN_PROVIDER_ORIGIN'], ['MAILBOX_RECEIPT_URL', 'MAILBOX_RECEIPT_RECIPIENT']]) {
      const present = pair.map(environment => supplied({ environment }));
      if (present.some(Boolean) && !present.every(Boolean)) throw new Error(`Configure both ${pair.join(' and ')} or leave both unset.`);
    }
  }
  declaration.secrets = (declaration.secrets ?? [])
    .filter(item => !item.optional || (purpose === 'deploy' && supplied(item)))
    .map(({ optional: _optional, ...item }) => item);
  const directory = join(root, '.rer', 'declarations');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (lstatSync(directory).isSymbolicLink()) throw new Error('Refusing a symbolic link at .rer/declarations.');
  const path = join(root, declarationPaths[purpose]);
  const text = `${JSON.stringify(declaration, null, 2)}\n`;
  let previous;
  try {
    if (lstatSync(path).isSymbolicLink()) throw new Error('Refusing a symbolic link at the resolved declaration.');
    previous = readFileSync(path, 'utf8');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous !== text) writeFileSync(path, text, { mode: 0o600 });
  return declarationPaths[purpose];
}
