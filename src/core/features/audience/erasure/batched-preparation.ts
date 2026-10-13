/** Coalesce independent public-helper statement preparation into native batches.
 * Every SQL statement still executes and every returned fence is committed by
 * the caller. This adapter knows no portability schema or journal algorithm. */
export function batchedPreparation(database:D1Database){
  const originals=new WeakMap<D1PreparedStatement,D1PreparedStatement>();
  const sources=new WeakMap<D1PreparedStatement,string>();
  type Pending={statement:D1PreparedStatement;resolve:(value:D1Result)=>void;reject:(error:unknown)=>void};
  let pending:Pending[]=[];
  const unwrap=(statement:D1PreparedStatement)=>originals.get(statement)??statement;
  function enqueue(statement:D1PreparedStatement):Promise<D1Result>{
    return new Promise((resolve,reject)=>{
      pending.push({statement,resolve,reject});
      if(pending.length!==1)return;
      queueMicrotask(async()=>{
        const batch=pending;pending=[];
        try{const results=await database.batch(batch.map(item=>item.statement));batch.forEach((item,index)=>item.resolve(results[index]));}
        catch(error){batch.forEach(item=>item.reject(error));}
      });
    });
  }
  function wrap(statement:D1PreparedStatement,sql:string):D1PreparedStatement{
    sources.set(statement,sql);
    const proxy=new Proxy(statement,{get(target,key){
      if(key==='bind')return(...values:unknown[])=>wrap(target.bind(...values),sql);
      if(key==='run'||key==='all')return()=>enqueue(target);
      if(key==='first')return async(column?:string)=>{const row=(await enqueue(target)).results[0] as Record<string,unknown>|undefined;return row?(column===undefined?row:row[column]):null;};
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});originals.set(proxy,statement);sources.set(proxy,sql);return proxy;
  }
  const db=new Proxy(database,{get(target,key){
    if(key==='prepare')return(sql:string)=>wrap(target.prepare(sql),sql);
    if(key==='batch')return(statements:D1PreparedStatement[])=>target.batch(statements.map(unwrap));
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
  return {db,unwrap,sql:(statement:D1PreparedStatement)=>{const sql=sources.get(statement);if(!sql)throw new Error('Untracked prepared statement');return sql;}};
}
