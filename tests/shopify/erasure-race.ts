// Test-only scheduling at the native D1 batch boundary. Every SQL statement is
// executed by the real binding; failures are observed and rethrown unchanged.
let barrier:{waiting:boolean}|undefined;
let expireAuthority=false;
const failures:string[]=[];
export async function erasureRace(action:string){
  if(action==='arm'){
    if(barrier)throw new Error('Erasure barrier is already armed');
    failures.length=0;barrier={waiting:false};
  }else if(action==='expire-authority')expireAuthority=true;
  else if(action==='arrived'){
    const current=barrier;if(!current)throw new Error('Erasure barrier is not armed');
    while(barrier===current&&!current.waiting)await new Promise<void>(resolve=>setTimeout(resolve,10));
    if(!current.waiting)throw new Error('Erasure barrier released before arrival');
  }
  else if(action==='release')barrier=undefined;
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
      const current=barrier;
      if(current&&!current.waiting&&progress){
        current.waiting=true;
        // Each timer belongs to this active native Queue request. A promise
        // created by the completed arm request cannot safely suspend it.
        while(barrier===current)await new Promise<void>(resolve=>setTimeout(resolve,10));
      }
      if(expireAuthority&&progress){expireAuthority=false;await target.prepare('UPDATE oa_sessions SET expires_at=0').run();}
      try{return await target.batch(statements.map(statement=>originals.get(statement)??statement));}
      catch(error){if(progress&&error instanceof Error)failures.push(error.message);throw error;}
    };
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
}
