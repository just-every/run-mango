async function connectionKey(signingKey:string) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('mango-installation-sending-v1:'+signingKey));
  return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
}
export type SendingSecret={apiKey:string;provider?:'resend'|'sendgrid';publicKey?:string};
export async function sealSendingSecret(value:SendingSecret,key:string) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await connectionKey(key),new TextEncoder().encode(JSON.stringify(value)));
  return JSON.stringify([Array.from(iv),Array.from(new Uint8Array(cipher))]);
}
export async function openSendingSecret(cipher:string,key:string):Promise<SendingSecret> {
  const [iv,bytes]=JSON.parse(cipher);
  const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(iv)},await connectionKey(key),new Uint8Array(bytes));
  return JSON.parse(new TextDecoder().decode(clear));
}
