export function meter(database:D1Database) {
 let count=0,maxBindings=0,maxSqlBytes=0;
 const originals=new WeakMap<object,D1PreparedStatement>();
 function statement(sql:string,params:unknown[]=[]):D1PreparedStatement {
  maxBindings=Math.max(maxBindings,params.length);maxSqlBytes=Math.max(maxSqlBytes,new TextEncoder().encode(sql).length);
  const actual=params.length?database.prepare(sql).bind(...params):database.prepare(sql);
  const wrapped=new Proxy(actual,{get(target,key){
   if(key==='bind')return (...values:unknown[])=>statement(sql,values);
   if(['all','first','run','raw'].includes(String(key)))return (...args:unknown[])=>{charge(1);return (target[key as keyof D1PreparedStatement] as Function).apply(target,args);};
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});originals.set(wrapped,actual);return wrapped;
 }
 function charge(n:number){count+=n;if(count>1000)throw new Error(`D1 invocation exceeded 1000 statements (${count})`);}
 return {db:new Proxy(database,{get(target,key){if(key==='prepare')return statement;if(key==='batch')return (items:D1PreparedStatement[])=>{charge(items.length);return target.batch(items.map(item=>originals.get(item)!));};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}}),stats:()=>({count,maxBindings,maxSqlBytes}),reset:()=>{count=0;maxBindings=0;maxSqlBytes=0;}};
}
