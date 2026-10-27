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
      const count = {main: 7, 'local-start': 3, 'go-live': 9}[stage];
      return Array.from({length: count}, (_, offset) => ({ name: `${stage}-${offset + 1}-of-${count}`, stage, shard: `${offset + 1}/${count}`, browser: true }));
    }),
    ...['newsletter-ui', 'campaign-results', 'move-in'].map(stage => ({ name: stage, stage, browser: true })),
  ];
  const slow = [{ name: 'local-start-slow', stage: 'local-start-slow', browser: true }];
  // 2026-10-26 green run 40421992456: 141m10s of member execution.
  // Fourteen members take >=321s; the smallest pair takes 684s, so at
  // 672s/member-group capacity fourteen jobs is the minimum. These packs
  // leave ~48s for setup inside 12m; native runtimes must run sequentially.
  const packs = [
    ['static', 'main-1-of-7', 'go-live-9-of-9'],
    ['go-live-1-of-9', 'go-live-6-of-9'],
    ['main-3-of-7', 'main-5-of-7'],
    ['local-start-2-of-3', 'main-7-of-7'],
    ['main-4-of-7', 'newsletter-ui'],
    ['move-in', 'main-2-of-7'],
    ['go-live-3-of-9', 'local-start-3-of-3'],
    ['go-live-8-of-9', 'main-6-of-7'],
    ['local-start-1-of-3'], ['go-live-2-of-9'], ['campaign-results'],
    ['go-live-7-of-9'], ['go-live-4-of-9'], ['go-live-5-of-9'],
  ];
  const grouped = packs.map((names, index) => ({
    name: index === 0 ? 'static' : names.length === 1 ? names[0] : `group-${index + 1}`,
    browser: true,
    members: names.map(name => push.find(row => row.name === name)),
  }));
  const slowGroups = slow.map(row => ({ ...row, members: [row] }));
  return { include: tier === 'push' ? grouped : tier === 'slow' ? slowGroups : [...grouped, ...slowGroups] };
}
