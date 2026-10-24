import {z} from 'zod';
export const nodeKinds = {
  trigger: ['Trigger', 'Starts when the chosen event occurs. Enrolment is not available yet.'],
  delay: ['Time delay', 'Waits for a duration before continuing.'],
  'wait-until': ['Wait until', 'Waits until a chosen date or condition.'],
  condition: ['Conditional split', 'Chooses a path using a contact condition.'],
  'trigger-split': ['Trigger split', 'Chooses a path using the triggering event.'],
  random: ['Random or A/B split', 'Divides contacts between paths.'],
  email: ['Send email', 'Uses a saved email message. Draft only; sending is not available.'],
  sms: ['Send SMS', 'Unavailable: SMS flow transport and consent admission are not connected.'],
  push: ['Send push', 'Unavailable: no push transport is connected.'],
  property: ['Update property', 'Changes a contact property when the flow runs.'],
  tag: ['Tag', 'Adds a contact tag when the flow runs.'],
  webhook: ['Webhook', 'Unavailable: outbound webhook authority is not connected.'],
  notify: ['Notify team', 'Unavailable: team notification delivery is not connected.'],
  task: ['Create CRM task', 'Unavailable: no CRM task connection is configured.'],
  exit: ['Exit', 'Ends this path.'],
} as const;
export type NodeKind = keyof typeof nodeKinds;
const kind = z.enum(Object.keys(nodeKinds) as [NodeKind,...NodeKind[]]);
export const graphSchema = z.object({name:z.string().trim().min(1).max(100),trigger:z.string().trim().min(1).max(300),nodes:z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9-]{1,64}$/),kind,label:z.string().trim().min(1).max(300),next:z.array(z.string()).max(100)}).strict()).min(2).max(100)}).strict();
export type FlowGraph = z.infer<typeof graphSchema>;
export function validateGraph(graph: FlowGraph): string[] {
  const errors:string[]=[], nodes=new Map(graph.nodes.map(n=>[n.id,n])), roots=graph.nodes.filter(n=>n.kind==='trigger');
  if(nodes.size!==graph.nodes.length)errors.push('Each node needs a distinct identity.');
  if(roots.length!==1)errors.push('Choose exactly one trigger node.');
  for(const node of graph.nodes) {
    if(node.next.some(id=>!nodes.has(id)))errors.push(`${node.label}: a connection names a missing node.`);
    if(node.kind==='exit'&&node.next.length)errors.push(`${node.label}: an exit cannot continue.`);
    if(node.kind!=='exit'&&!node.next.length)errors.push(`${node.label}: unended path; connect it to an exit.`);
  }
  const seen=new Set<string>();
  const reach=(id:string)=>{if(seen.has(id)||!nodes.has(id))return;seen.add(id);nodes.get(id)!.next.forEach(reach);};
  roots.forEach(n=>reach(n.id));
  graph.nodes.filter(n=>!seen.has(n.id)).forEach(n=>errors.push(`${n.label}: unreachable node.`));
  // Removing real time-delay nodes must leave an acyclic graph. A wait-until
  // may already be satisfied, so it cannot establish a delay in a loop.
  const visited=new Set<string>(), active=new Set<string>();
  const visit=(id:string)=>{const n=nodes.get(id);if(!n||n.kind==='delay'||visited.has(id))return;
    if(active.has(id)){errors.push(`${n.label}: loop without a time delay.`);return;}
    active.add(id);n.next.forEach(visit);active.delete(id);visited.add(id);};
  graph.nodes.forEach(n=>visit(n.id));
  const ended=new Set(graph.nodes.filter(n=>n.kind==='exit').map(n=>n.id));
  for(let i=0;i<graph.nodes.length;i++)for(const n of graph.nodes)if(n.next.some(id=>ended.has(id)))ended.add(n.id);
  graph.nodes.filter(n=>!ended.has(n.id)).forEach(n=>errors.push(`${n.label}: no path reaches an exit.`));
  return [...new Set(errors)];
}
