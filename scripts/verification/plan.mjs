// Playwright positional arguments are regexes: select each whole declared path.
const filePattern = file => '(?:^|/)' + file.split('.').join(String.fromCharCode(92) + '.') + '$';
const pnpm = (name, args) => ({ name, command: 'pnpm', args });
export const configs = {
  main: 'playwright.config.js',
  'local-start': 'scripts/verification/local-start.config.mjs',
  'local-start-slow': 'tests/local-start/config.js',
  'newsletter-ui': 'tests/newsletter-ui/playwright.config.js',
  'campaign-results': 'tests/campaign-results/playwright.config.js',
  'go-live': 'tests/go-live/playwright.config.js',
  'move-in': 'tests/move-in/playwright.config.js',
};
export const stageNames = ['static', ...Object.keys(configs)];
const member = (stage, files) => ({name: stage, stage, files});
// Whole journeys stay together. Two workers use separate installations;
// migrations and commands inside each installation remain ordered.
export const packs = [
  {name:'authoring',members:[member('main',['campaign-authoring/browser.spec.ts','campaign-authoring/canonical-save.spec.ts','campaign-authoring/local-images.spec.ts','campaign-authoring/design-import.spec.ts','campaign-authoring/design-generation.spec.ts']),member('go-live',['content-checks.journeys.ts','woocommerce.journeys.ts','resend-delivery.journeys.ts','scheduler.journeys.ts'])]},
  {name:'identity-data',members:[member('main',['audience-controls/segments.spec.ts','audience-import/signup.spec.ts','audience-import/erasure.spec.ts','audience-import/privacy-portability.spec.ts','portability/privacy.spec.ts','docs.spec.ts','rendering.spec.ts','portability.spec.ts','production-entry.spec.ts','shopify/connection.spec.ts','proposals-decision/decision-routes.spec.ts']),member('local-start',['editor.journey.ts']),member('newsletter-ui')]},
  {name:'native',members:[member('local-start',['authority.journey.ts','command-data.journey.ts','retained-archive.journey.ts']),member('go-live',['mailbox-provider.journeys.ts'])]},
  {name:'reports',members:[member('campaign-results'),member('go-live',['managed-mail.journeys.ts','shared-kiosk.journeys.ts','opt-out-reasons.journeys.ts'])]},
  {name:'move-in',members:[member('move-in'),member('go-live',['personalisation.journeys.ts','open-estimates.journeys.ts'])]},
  {name:'campaigns',members:[member('go-live',['go-live.journeys.ts','contact-links.journeys.ts','presend-checks.journeys.ts','typed-tests.journeys.ts'])]},
  {name:'delivery',members:[member('go-live',['delivery.journeys.ts','delivery-recovery.journeys.ts','multistep.journeys.ts'])]},
  {name:'connections',members:[member('go-live',['source-freshness.journeys.ts','roles.journeys.ts','sync-integrations.journeys.ts'])]},
];

export function options(args, env = {}) {
  const result = {stage:env.MANGO_VERIFY_STAGE, shard:env.MANGO_VERIFY_SHARD, files:env.MANGO_VERIFY_FILES ? JSON.parse(env.MANGO_VERIFY_FILES) : undefined, testsOnly:false};
  for(let index=0;index<args.length;index++) {
    const flag=args[index];
    if(flag==='--help')result.help=true;
    else if(flag==='--tests-only')result.testsOnly=true;
    else if(flag==='--stage'||flag==='--shard')result[flag.slice(2)]=args[++index];
    else throw new Error(`Unknown verification option: ${flag}`);
  }
  if(result.stage&&!stageNames.includes(result.stage))throw new Error(`Unknown verification stage: ${result.stage}`);
  if(result.testsOnly&&result.stage)throw new Error('--tests-only cannot select a stage.');
  if(result.shard&&!/^([1-9]\d*)\/([1-9]\d*)$/.test(result.shard))throw new Error('Shard must be i/n.');
  return result;
}
export function verificationGroups({stage,shard,files,testsOnly}, cpuBudget) {
  const browser=(stage,files,shard)=>({
    ...pnpm(stage,['exec','playwright','test','--config',configs[stage],...(files??[]).map(filePattern),`--workers=${['main','go-live','campaign-results','move-in','local-start'].includes(stage)?Math.min(2,cpuBudget):1}`,'--reporter=list,./scripts/verification/reporter.mjs',...(shard?[`--shard=${shard}`]:[])]),timingRequired:true,
  });
  const staticGroups=[
    [{name:'command-contract',command:process.execPath,args:['node_modules/@runeditrun/rer/bin/rer.mjs','check','--profile','first-party']},pnpm('source',['run','source:check'])],
    [pnpm('typecheck',['run','typecheck']),pnpm('build',['run','build'])],
    [pnpm('integration',['run','integration:check'])],
  ];
  if(stage==='static')return staticGroups;
  if(stage)return [[browser(stage,files??(stage==='local-start-slow'?['local.journey.ts']:undefined),shard)]];
  return [...(testsOnly?[]:staticGroups),...Object.keys(configs).filter(name=>name!=='local-start-slow').map(name=>[browser(name)])];
}
export function matrix(tier) {
  if(!['push','slow','all'].includes(tier))throw new Error('Matrix tier must be push, slow or all.');
  const slow={name:'local-start-slow',members:[member('local-start-slow',['local.journey.ts'])]};
  return {include:(tier==='push'?packs:tier==='slow'?[slow]:packs.map(row=>row.name==='native'?{...row,members:[...row.members,...slow.members]}:row)).map(row=>({...row,browser:true,timeout:tier==='all'&&row.name==='native'?30:15}))};
}
