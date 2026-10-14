// Test-only scheduling at the native D1 batch boundary. Every SQL statement is
// executed by the real binding; failures are observed and rethrown unchanged.
let release:()=>void=()=>{};
let arrived:()=>void=()=>{};
let reached:Promise<void>;
let held:Promise<void>;
let armed=false,expireAuthority=false;
const failures:string[]=[];
export async function erasureRace(action:string){
  if(action==='arm'){
    failures.length=0;armed=true;
    reached=new Promise(resolve=>{arrived=resolve;});
    held=new Promise(resolve=>{release=resolve;});
  }else if(action==='expire-authority')expireAuthority=true;
  else if(action==='arrived')await reached;
  else if(action==='release')release();
  else if(action!=='status')throw new Error('Unknown erasure race control');
  return {failures:[...failures]};
}
export function raceDatabase(db:D1Database):D1Database {
  const originals=new WeakMap<D1PreparedStatement,D1PreparedStatement>();
  const sqls=new WeakMap<D1PreparedStatement,string>();
  function track(statement:D1PreparedStatement,sql:string):D1PreparedStatement {
    const proxy=new Proxy(statement,{get(target,key){
      if(key==='bind')return (...args:unknown[])=>track(target.bind(...args),sql);
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});
    originals.set(proxy,statement);sqls.set(proxy,sql);return proxy;
  }
  return new Proxy(db,{get(target,key){
    if(key==='prepare')return (sql:string)=>track(target.prepare(sql),sql);
    if(key==='batch')return async(statements:D1PreparedStatement[])=>{
      const progress=statements.some(statement=>sqls.get(statement)?.includes("revision=? AND state='pending') THEN 1 ELSE NULL END"));
      if(armed&&progress){armed=false;arrived();await held;}
      if(expireAuthority&&progress){expireAuthority=false;await target.prepare('UPDATE oa_sessions SET expires_at=0').run();}
      try{return await target.batch(statements.map(statement=>originals.get(statement)??statement));}
      catch(error){if(progress&&error instanceof Error)failures.push(error.message);throw error;}
    };
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
}
