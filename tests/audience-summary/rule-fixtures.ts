import type { InclusionRule } from '../../src/core/features/lifecycle/rules';
export type Predicate = InclusionRule['predicates'][number];
export const subscribed: Predicate = {sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'};
export const incompletePredicates: Predicate[] = [
  {sourceType:'contact',field:'email',comparator:'contains',value:''},
  {sourceType:'contact',field:'email',comparator:'contains',value:' \t\n'},
  {sourceType:'contact',field:'email',comparator:'contains',value:12},
  {sourceType:'contact',field:'email',comparator:'in',value:'subscriber'},
  {sourceType:'contact',field:'email',comparator:'in',value:[]},
  {sourceType:'contact',field:'email',comparator:'in',value:['ok',' \t']},
];
export const ruleJson = (predicate: Predicate) => JSON.stringify({version:1,operator:'all',predicates:[predicate]});
export const exclusionJson = (predicate: Predicate) => JSON.stringify([{version:1,reason:'excluded',predicate}]);
export function generatedOutput() {
  const claim={text:'Observed evidence: "value".',citations:[{key:'evidence',observedValueJson:'"value"'}]};
  return {summary:claim,
    audience:{inclusion:{version:1,operator:'all',predicates:[{...subscribed,lookbackDays:null}]},exclusions:[],explanation:claim},
    email:{subject:'News',html:'<p>News</p>',text:'News',preheader:'News'},sms:null,
    sender:{displayName:'Mango',fromEmail:'offers@example.test',replyToEmail:'reply@example.test',physicalAddress:'1 Test Street',smsSender:'MANGO'},
    messageCategory:'newsletter',links:[],steps:[{channel:'email',scheduledAt:'2031-04-07T00:00:00.000Z',sendByAt:'2031-04-07T13:59:00.000Z',timezone:'Australia/Brisbane',whyThisTime:claim}],forecast:null};
}
