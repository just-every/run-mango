import {generateKeyPairSync,sign} from 'node:crypto';
// Disposable provider's verification key; no account or production key is read.
const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
export const publicKey=pair.publicKey.export({type:'spki',format:'der'}).toString('base64');

export const signEvent=(timestamp,body)=>sign('sha256',Buffer.from(timestamp+body),pair.privateKey).toString('base64');
