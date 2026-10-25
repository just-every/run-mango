const pnpm = (name, args) => ({ name, command: 'pnpm', args });
export const configs = {
  main: 'playwright.config.js',
  'local-start': 'scripts/verification/local-start.config.mjs',
  'local-start-slow': 'tests/local-start/config.js',
  'newsletter-ui': 'tests/newsletter-ui/playwright.config.js',
  'sender-disclosure': 'tests/newsletter-ui/sender-playwright.config.js',
  'campaign-results': 'tests/campaign-results/playwright.config.js',
  'go-live': 'tests/go-live/playwright.config.js',
  'move-in': 'tests/move-in/playwright.config.js',
};
const sharded = new Set(['main', 'local-start', 'go-live']);
export const stageNames = ['static', ...sharded, 'newsletter-ui', 'campaign-results', 'move-in', 'local-start-slow'];

export function options(args, env = {}) {
  const result = { stage: env.MANGO_VERIFY_STAGE, shard: env.MANGO_VERIFY_SHARD, testsOnly: false };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error(`Duplicate verification option: ${flag}`);
    seen.add(flag);
    if (flag === '--help') result.help = true;
    else if (flag === '--tests-only') result.testsOnly = true;
    else if (flag === '--stage' || flag === '--shard') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
      result[flag.slice(2)] = value;
    } else throw new Error(`Unknown verification option: ${flag}`);
  }
  if (result.stage && !stageNames.includes(result.stage)) throw new Error(`Unknown verification stage: ${result.stage}`);
  if (result.testsOnly && result.stage) throw new Error('--tests-only cannot be combined with a selected stage.');
  if (result.shard) {
    const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(result.shard);
    if (!match || !Number.isSafeInteger(Number(match[2])) || Number(match[1]) > Number(match[2])) throw new Error('Shard must be i/n with 1 <= i <= n.');
    if (!sharded.has(result.stage)) throw new Error('--shard requires --stage main, local-start or go-live.');
  }
  return result;
}

export function verificationGroups({ stage, shard, testsOnly }, cpuBudget) {
  const mainWorkers = Math.min(2, cpuBudget);
  const browser = name => {
    // Keep unchanged long authoring files from competing on the same shard.
    // The adapter proves the exact native selection plus/minus that whole file.
    if (name === 'main' && ['3/7', '4/7', '7/7'].includes(shard)) return {
      name: `main-${shard.replace('/', '-of-')}`, command: process.execPath,
      args: ['scripts/verification/main-shard.mjs', shard, `--workers=${mainWorkers}`,
        '--reporter=list,./scripts/verification/reporter.mjs'], timingRequired: true,
    };
    const args = ['exec', 'playwright', 'test', '--config', configs[name],
      `--workers=${name === 'main' ? mainWorkers : 1}`, '--reporter=list,./scripts/verification/reporter.mjs'];
    // Only local.journey.ts clones and installs from scratch. The other native
    // journeys reuse dependencies and retain routine auth/data-loss coverage.
    if (name === 'local-start-slow') args.push('local.journey.ts');
    if (shard) args.push(`--shard=${shard}`);
    return { ...pnpm(shard ? `${name}-${shard.replace('/', '-of-')}` : name, args), timingRequired: true };
  };
  const staticGroups = [
    [{ name: 'test-budget', command: process.execPath, args: ['scripts/verification/test-budget.mjs'] }],
    [{ name: 'command-contract', command: process.execPath, args: ['node_modules/@runeditrun/rer/bin/rer.mjs', 'check', '--profile', 'first-party'] }, pnpm('source', ['run', 'source:check'])],
    [pnpm('typecheck', ['run', 'typecheck'])],
    [pnpm('build', ['run', 'build'])],
  ];
  const operations = [{ ...pnpm('operations', ['run', 'test:operations']), timingRequired: true }];
  const integration = [pnpm('integration', ['run', 'integration:check'])];
  const ui = ['newsletter-ui', 'sender-disclosure'].map(name => [browser(name)]);
  if (stage === 'static') return [...staticGroups, operations, integration];
  if (stage === 'newsletter-ui') return ui;
  if (stage) return [[browser(stage)]];
  const main = browser('main'), native = browser('local-start');
  return [...(testsOnly ? [] : staticGroups), operations,
    ...(cpuBudget >= mainWorkers + 1 ? [[main, native]] : [[main], [native]]),
    ...ui, [browser('campaign-results')], [browser('go-live')], [browser('move-in')], integration];
}

export function matrix(tier) {
  if (!['push', 'slow', 'all'].includes(tier)) throw new Error('Matrix tier must be push, slow or all.');
  const push = [
    { name: 'static', stage: 'static', browser: true, hosted: true },
    ...[...sharded].flatMap(stage => {
      // Native delivery journeys build and restart their own runtimes. Give
      // these files smaller groups so the complete push wall stays under 15 minutes.
      const count = {main: 7, 'local-start': 3, 'go-live': 9}[stage];
      return Array.from({length: count}, (_, offset) => ({ name: `${stage}-${offset + 1}-of-${count}`, stage, shard: `${offset + 1}/${count}`, browser: true }));
    }),
    // Newsletter UI and campaign results each start their own runtimes. Separate
    // jobs keep both within the per-job limit on slower runners.
    ...['newsletter-ui', 'campaign-results', 'move-in'].map(stage => ({ name: stage, stage, browser: true })),
  ];
  const slow = [{ name: 'local-start-slow', stage: 'local-start-slow', browser: true }];
  return { include: tier === 'push' ? push : tier === 'slow' ? slow : [...push, ...slow] };
}
