/** WooCommerce's paid/read network boundary only. Native sync and webhook
 * validation, source custody, consent and flow effects remain in Mango. */
export default {async fetch(request,{fixture}={}){
 const url=new URL(request.url),path=url.pathname.replace('/wp-json/wc/v3/','');
 if(url.pathname==='/')return new Response('Orchard store',{status:200});
 if(request.method!=='GET'||!request.headers.get('Authorization')?.startsWith('Basic '))return new Response(null,{status:401});
 const at=new Date().toISOString().replace(/Z$/,'');
 const customer={id:11,date_created_gmt:at,date_modified_gmt:at,email:fixture.email,first_name:'Orchard',last_name:'Reader'};
 const product={id:21,date_created_gmt:at,date_modified_gmt:at,name:'Orchard harvest box',status:'publish',permalink:'https://woo.example.test/harvest',categories:[{id:2,name:'Harvest'}]};
 const data={'customers/11':customer,'products/21':product,'customers':[customer],'products':[product],'orders':[],
  'mango/status':{version:1,trackingEnabled:true},'mango/checkouts':[],'mango/events':[]};
 return path in data?Response.json(data[path],{headers:{'X-WP-TotalPages':'1'}}):new Response(null,{status:404});
}};
