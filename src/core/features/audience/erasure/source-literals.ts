import {Buffer} from 'node:buffer';

/** Contact-specific free text can be copied into a saved message or evidence.
 * Learn it from matched source records, never from consent/control vocabulary. */
export function personalSourceLiterals(values:Record<string,unknown>={}){
  const literals=new Set<string>();
  function visit(value:unknown){
    if(Array.isArray(value)){value.forEach(visit);return;}
    if(value&&typeof value==='object'){Object.values(value).forEach(visit);return;}
    if(typeof value!=='string'||!value.trim()||/^[\d\s:./T+Z-]+$/.test(value))return;
    try{const parsed:unknown=JSON.parse(value);if(parsed&&typeof parsed==='object'){visit(parsed);return;}}catch{}
    if(value.length>=16&&value.length%4===0&&/^[A-Za-z0-9+/]+={0,2}$/.test(value)){
      const decoded=Buffer.from(value,'base64').toString('utf8');
      if(decoded!==value&&Buffer.from(decoded).toString('base64')===value){visit(decoded);return;}
    }
    literals.add(value);
  }
  for(const [field,value]of Object.entries(values)){
    const words=field.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().split(/[^a-z]+/);
    if(words.some(word=>['consent','status','category','frequency','version','schema','timestamp','time','date','method','jurisdiction','channel'].includes(word)))continue;
    if(words.some(word=>['note','notes','message','messages','comment','comments','description','content','body','subject','name','address','street','phone','telephone'].includes(word)))visit(value);
  }
  return [...literals];
}
