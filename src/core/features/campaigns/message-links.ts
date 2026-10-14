/** Plain-text punctuation is outside a URL. HTML-derived text encloses each
 * destination in parentheses, so matching the whole regex token loses parity. */
export function rewriteTextLinks(text:string,rewrites?:ReadonlyMap<string,string>) {
  return text.replace(/https?:\/\/[^\s<>"']+/g,value=>{
    if(rewrites?.has(value))return rewrites.get(value)!;
    let destination=value;
    while(/[),.;]$/.test(destination)) {
      destination=destination.slice(0,-1);
      const replacement=rewrites?.get(destination);
      if(replacement)return replacement+value.slice(destination.length);
    }
    return value;
  });
}
export function textLinkDestinations(text:string) {
  return [...text.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(match=>match[0].replace(/[),.;]+$/,''));
}
