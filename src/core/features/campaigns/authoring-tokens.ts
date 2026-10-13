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
