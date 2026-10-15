/** Retain scanner observations, but never let known automated navigation win. */
export function trackedRequestAutomation(request:Request) {
  if(request.method!=='GET')return 'non-navigation-request';
  if(/prefetch|prerender/i.test([request.headers.get('purpose'),request.headers.get('sec-purpose'),request.headers.get('x-purpose')].join(' ')))return 'prefetch';
  const agent=request.headers.get('user-agent')??'';
  if(!agent.trim())return 'missing-user-agent';
  if(/barracuda|mimecast|proofpoint|safelinks|messagelabs/i.test(agent))return 'mailbox-security-scanner';
  if(/bot\b|crawler|spider|preview|slurp|curl\/|wget\/|httpclient|python-requests|httpx\//i.test(agent))return 'known-bot';
  return undefined;
}
