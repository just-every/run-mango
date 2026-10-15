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
    for (const pair of [['DESIGN_PROVIDER_API_KEY', 'DESIGN_PROVIDER_ORIGIN'], ['MAILBOX_RECEIPT_URL', 'MAILBOX_RECEIPT_RECIPIENT'], ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY']]) {
      const present = pair.map(environment => supplied({ environment }));
      if (present.some(Boolean) && !present.every(Boolean)) throw new Error(`Configure both ${pair.join(' and ')} or leave both unset.`);
    }
    const marketingNames = ['MARKETING_MAIL_PROVIDER', 'MARKETING_MAIL_API_KEY', 'MARKETING_MAIL_WEBHOOK_SECRET', 'MARKETING_MAIL_WEBHOOK_ID'];
    const marketingValue = name => env[name]?.trim() || declaration.vars[name]?.trim();
    if (marketingNames.some(name => marketingValue(name))) {
      const marketingProvider = marketingValue('MARKETING_MAIL_PROVIDER');
      if (!marketingProvider) throw new Error('Configure MARKETING_MAIL_PROVIDER (sendgrid or resend) or leave all marketing mail inputs unset.');
      if (!['sendgrid', 'resend'].includes(marketingProvider)) throw new Error('MARKETING_MAIL_PROVIDER must be sendgrid or resend.');
      const required = ['MARKETING_MAIL_API_KEY', ...(marketingProvider === 'resend' ? ['MARKETING_MAIL_WEBHOOK_SECRET', 'MARKETING_MAIL_WEBHOOK_ID'] : [])];
      const missing = required.filter(name => !marketingValue(name));
      if (missing.length) throw new Error(`Configure marketing mail inputs: ${missing.join(', ')}.`);
    }
    for (const name of ['MARKETING_MAIL_PROVIDER', 'MARKETING_MAIL_WEBHOOK_ID']) {
      if (supplied({environment: name})) declaration.vars[name] = env[name].trim();
    }
  }
  const provider = env.MAIL_PROVIDER?.trim() || declaration.vars.MAIL_PROVIDER;
  const managedMail = provider === 'rer';
  const legacyMailKeyEnvironment = 'MAIL_PROVIDER_API_KEY';
  const mailSources = managedMail ? ['MAIL_FROM', 'MAIL_API_KEY', 'MAIL_RELAY_URL'] : [
    supplied({environment: 'MAIL_FROM'}) ? 'MAIL_FROM' : 'MAIL_AUTH_FROM',
    supplied({environment: 'MAIL_API_KEY'}) ? 'MAIL_API_KEY' : legacyMailKeyEnvironment,
  ];
  const mailNames = new Set(['MAIL_FROM', 'MAIL_API_KEY', 'MAIL_RELAY_URL', 'MAIL_AUTH_FROM', 'MAIL_PROVIDER_API_KEY']);
  declaration.secrets = (declaration.secrets ?? [])
    .filter(item => mailNames.has(item.binding) ? mailSources.includes(item.binding)
      : !item.optional || (purpose === 'deploy' && supplied(item)))
    .map(({ optional: _optional, ...item }) => item);
  // Keep legacy direct-provider deployments working through Base's canonical mail preflight.
  for (const [binding, source] of [['MAIL_FROM', 'MAIL_AUTH_FROM'], ['MAIL_API_KEY', 'MAIL_PROVIDER_API_KEY']]) {
    const input = declaration.secrets.find(item => item.binding === source);
    if (input) declaration.secrets.push({ binding, environment: input.environment });
  }
  declaration.vars.MAIL_PROVIDER = provider;
  // Configure declares public mail inputs; owner deploy may instead bind the same values privately.
  for (const {binding} of declaration.secrets) delete declaration.vars[binding];
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
