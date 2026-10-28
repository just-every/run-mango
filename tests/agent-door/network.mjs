/** Test-only provider edge. No application persistence or authorization is replaced.
 * Native sender evidence still has to pass its real DNS/domain/receipt checks.
 * Undeclared or unsupported requests refuse; a receipt is never invented for
 * a production handoff or an unimplemented provider operation.
 */
export default {
 async fetch(request){
  const url=new URL(request.url);
  if(request.method==='POST'&&url.origin==='https://api.sendgrid.com'&&url.pathname==='/v3/mail/send'){
   await request.arrayBuffer();return new Response(null,{status:202,headers:{'x-message-id':crypto.randomUUID()}});
  }
  if(request.method==='POST'&&url.origin==='https://api.resend.com'&&url.pathname==='/emails'){
   await request.arrayBuffer();return Response.json({id:crypto.randomUUID()});
  }
  return new Response('This provider operation has no declared conformance fixture.',{status:502});
 }
};
