const scopes=['mail.send','user.username.read','whitelabel.read','whitelabel.create','user.webhooks.event.settings.read',
 'user.webhooks.event.settings.create','user.webhooks.event.settings.update','user.webhooks.event.settings.delete','user.webhooks.event.test.create'];
const webhooks=new Map();
/** Provider account/webhook boundary. Mango validates and stores the connection. */
export default {async fetch(request,{fixture}){
 const path=new URL(request.url).pathname;
 if(path==='/v3/scopes')return Response.json({scopes});
 if(path==='/v3/user/username')return Response.json({username:'Orchard test account',user_id:77});
 if(path==='/v3/user/webhooks/event/settings/all')return Response.json({max_allowed:10,webhooks:[...webhooks.values()]});
 if(path==='/v3/user/webhooks/event/settings'&&request.method==='POST'){
  const body=await request.json(),id=crypto.randomUUID(),row={...body,id};webhooks.set(id,row);return Response.json(row,{status:201});
 }
 const match=/^\/v3\/user\/webhooks\/event\/settings\/(signed\/)?([^/]+)$/.exec(path),row=match&&webhooks.get(match[2]);
 if(!row)return new Response(null,{status:404});
 if(request.method==='DELETE'){webhooks.delete(row.id);return new Response(null,{status:204});}
 if(request.method==='PATCH'){
  const body=await request.json();if(match[1])row.public_key=fixture.publicKey;else Object.assign(row,body);
 }
 return Response.json(match[1]?{id:row.id,public_key:row.public_key}:row);
}};
