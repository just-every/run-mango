/** Preserve token fallback text as data while examining authored HTML structure. */
export function protectAuthoringTokens(source:string, keepManaged=false) {
  let prefix='\uE000mango';
  while(source.includes(prefix))prefix+='x';
  const tokens:string[]=[];
  const html=source.replace(/\{\{([\s\S]*?)\}\}/g,(token,inner:string)=>{
    if(keepManaged&&['unsubscribe_url','physical_address'].includes(inner.trim()))return token;
    const index=tokens.push(token)-1;return `${prefix}${index}\uE001`;
  });
  return {html,restore:(text:string,encode:(token:string)=>string=token=>token)=>tokens.reduce((result,token,index)=>result.replaceAll(`${prefix}${index}\uE001`,()=>encode(token)),text)};
}
/** One `{{…}}` token's inner text: a managed token, a personalisation key with its fallback, or undefined when invalid. */
export function parsePersonalisationToken(source: string) {
  const token = source.trim();
  if (token === 'unsubscribe_url' || token === 'physical_address') return {managed: token};
  const match = /^([a-zA-Z0-9_.-]+)\s*\|\s*(?:fallback|default)\s*:\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^"'{}\r\n]*))$/.exec(token);
  if (!match) return undefined;
  const fallback = match[2] ?? match[3] ?? match[4].trim();
  return fallback.length ? {key: match[1], fallback} : undefined;
}
/** Text as a recipient without that personalisation value reads it: each personalisation token as its fallback.
 * Managed and invalid tokens stay as written. */
export function withTokenFallbacks(text: string) {
  return text.replace(/\{\{([\s\S]*?)\}\}/g, (token, inner: string) => {
    const parsed = parsePersonalisationToken(inner);
    return parsed?.key ? parsed.fallback! : token;
  });
}
