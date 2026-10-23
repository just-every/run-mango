import type {IncomingMessage,ServerResponse} from 'node:http';
const scopes=['mail.send','user.username.read','whitelabel.read','whitelabel.create','user.webhooks.event.settings.read',
  'user.webhooks.event.settings.create','user.webhooks.event.settings.update','user.webhooks.event.settings.delete','user.webhooks.event.test.create'];
/** Provider network edge only. Existing account settings remain observable. */
export function sendgridConnectionEdge(publicKey:string) {
  const existing={id:'synthetic-mango-81',friendly_name:'Synthetic existing webhook',url:'https://existing.example.test/events',enabled:true,delivered:false};
  const state={scopes:[...scopes],maxAllowed:2,failSigning:false,failReadKey:false,webhooks:[{...existing}] as any[],mutations:[] as {method:string;id?:string;body?:any}[]};
  const json=(response:ServerResponse,status:number,value?:unknown)=>{response.writeHead(status,{'Content-Type':'application/json'});response.end(value===undefined?'':JSON.stringify(value));};
  async function handle(url:URL,request:IncomingMessage,response:ServerResponse) {
    if(url.hostname!=='api.sendgrid.com')return false;
    const path=url.pathname,method=request.method;
    if(path==='/v3/scopes'){json(response,200,{scopes:state.scopes});return true;}
    if(path==='/v3/user/username'){json(response,200,{username:'synthetic-mango-82',user_id:82});return true;}
    if(path==='/v3/user/webhooks/event/settings/all'){json(response,200,{max_allowed:state.maxAllowed,webhooks:state.webhooks});return true;}
    if(!path.startsWith('/v3/user/webhooks/event/'))return false;
    const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(chunk);
    const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):undefined;
    if(path==='/v3/user/webhooks/event/settings'&&method==='POST') {
      const row={...body,id:'synthetic-mango-'+(83+state.mutations.filter(v=>v.method==='POST').length)};
      state.webhooks.push(row);state.mutations.push({method,body});json(response,201,row);return true;
    }
    const match=/^\/v3\/user\/webhooks\/event\/settings\/(signed\/)?([^/]+)$/.exec(path);
    if(!match){json(response,404,{errors:[{message:'Synthetic unsupported webhook operation'}]});return true;}
    const id=decodeURIComponent(match[2]),row=state.webhooks.find(v=>v.id===id);
    if(!row){json(response,404,{});return true;}
    if(match[1]) {
      if(method==='PATCH') {
        state.mutations.push({method,id,body});
        if(state.failSigning){json(response,403,{});return true;}
        row.public_key=publicKey;
      }
      json(response,200,{id,public_key:state.failReadKey?'':row.public_key??''});return true;
    }
    if(method==='DELETE'){state.mutations.push({method,id});state.webhooks.splice(state.webhooks.indexOf(row),1);json(response,204);return true;}
    if(method==='PATCH'){Object.assign(row,body);state.mutations.push({method,id,body});}
    json(response,200,row);return true;
  }
  return {state,existing,scopes,handle};
}
