import {IntegrationError} from '../schema';
export type SupportedApp='judgeme'|'okendo'|'smile';
const bytes=new TextEncoder();
function decode(value:string) {try{return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}catch{throw new IntegrationError('invalid_adapter_signature',401);}}
async function verify(key:Uint8Array,message:string,signature:Uint8Array) {
  const hmac=await crypto.subtle.importKey('raw',key as BufferSource,{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',hmac,signature as BufferSource,bytes.encode(message));
}
/** Judge.me's documented hexadecimal body HMAC; Okendo uses Svix; Smile
 * signs timestamp.body as base64. No unsigned identity/header is trusted. */
export async function verifyAdapter(app:SupportedApp,headers:Headers,body:string,secret:string) {
  if(app==='judgeme') {
    const canonical=headers.get('Judgeme-Hmac-Sha256'),alternate=headers.get('X-Judgeme-Hmac-Sha256');
    const signature=canonical??alternate;
    if(!signature||!(/^[a-f0-9]{64}$/i.test(signature))||(canonical&&alternate&&canonical!==alternate)
      ||!await verify(bytes.encode(secret),body,Uint8Array.from(signature.match(/../g)!,v=>parseInt(v,16))))throw new IntegrationError('invalid_adapter_signature',401);
    return;
  }
  const timestamp=headers.get(app==='okendo'?'svix-timestamp':'Smile-Timestamp')??'';
  if(!/^\d{10}$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300)throw new IntegrationError('adapter_signature_expired',401);
  if(app==='smile') {
    const signature=headers.get('Smile-Signature');
    if(!signature||!await verify(bytes.encode(secret),timestamp+'.'+body,decode(signature)))throw new IntegrationError('invalid_adapter_signature',401);
  } else {
    const id=headers.get('svix-id'),signatures=headers.get('svix-signature');
    if(!id||id.length>200||!signatures||signatures.length>1024||!secret.startsWith('whsec_'))throw new IntegrationError('invalid_adapter_signature',401);
    const valid=await Promise.all(signatures.split(' ').filter(s=>s.startsWith('v1,')).map(s=>verify(decode(secret.slice(6)),id+'.'+timestamp+'.'+body,decode(s.slice(3)))));
    if(!valid.some(Boolean))throw new IntegrationError('invalid_adapter_signature',401);
  }
}
