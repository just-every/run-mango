import {AsyncLocalStorage} from 'node:async_hooks';

const operations=new AsyncLocalStorage<number>();
const bindings=new WeakMap<D1Database,D1Database>();
const originals=new WeakMap<D1Database,D1Database>();
// SQL is application-owned. Treat CTEs and every non-read form conservatively.
export function erasureWriteCost(sql:string){
 if(operations.getStore()===undefined||/^\s*(SELECT|PRAGMA|EXPLAIN)\b/i.test(sql))return 0;
 const table=sql.match(/^\s*(?:INSERT(?: OR \w+)? INTO|REPLACE INTO|UPDATE|DELETE FROM)\s+["`]?([\w]+)/i)?.[1]?.toLowerCase();
 // Independently serving operator identities remain usable during maintenance.
 if(table==='operators'||table==='integration_audit'||table==='integration_credentials'||table?.startsWith('oc_')||(table?.startsWith('oa_')&&table!=='oa_limits'))return 0;
 return 2;
}
/** A request admitted before deletion must not append personal data after the
 * pending lock clears. The monotonic receipt count is checked in each native
 * write transaction, so stale asynchronous work cannot outlive erasure. */
export async function withErasureWriteFence<T>(db:D1Database,work:()=>Promise<T>):Promise<T>{
 const raw=originals.get(db)??db;
 const state=await raw.prepare('SELECT count(*) AS generation FROM audience_erasures').first<{generation:number}>();
 return operations.run(state!.generation,work);
}
export function erasureFencedDatabase(database:D1Database):D1Database{
 if(originals.has(database))return database;
 const existing=bindings.get(database);if(existing)return existing;
 const statements=new WeakMap<D1PreparedStatement,{original:D1PreparedStatement;sql:string}>();
 async function execute(items:D1PreparedStatement[]){
  const rows=items.map(item=>statements.get(item)??{original:item,sql:''});
  const generation=operations.getStore();
  if(generation===undefined||!rows.some(row=>erasureWriteCost(row.sql)))return database.batch(rows.map(row=>row.original));
  const result=await database.batch([
   database.prepare("INSERT INTO audience_erasure_guard SELECT CASE WHEN (SELECT count(*) FROM audience_erasures)=? AND NOT EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending') THEN 1 ELSE 0 END").bind(generation),
   ...rows.map(row=>row.original),database.prepare('DELETE FROM audience_erasure_guard'),
  ]);
  return result.slice(1,-1);
 }
 function wrap(original:D1PreparedStatement,sql:string):D1PreparedStatement{
  const wrapped=new Proxy(original,{get(target,key){
   if(key==='bind')return(...params:unknown[])=>wrap(target.bind(...params),sql);
   if(['run','all','first','raw'].includes(String(key)))return async(...args:unknown[])=>{
    if(!erasureWriteCost(sql))return (target[key as keyof D1PreparedStatement] as Function).apply(target,args);
    const result=(await execute([wrapped]))[0] as D1Result<Record<string,unknown>>;
    if(key==='first'){const row=result.results[0];return row?(args[0]===undefined?row:row[String(args[0])]):null;}
    if(key==='raw'){const rows=result.results.map(row=>Object.values(row));return (args[0] as {columnNames?:boolean}|undefined)?.columnNames?[Object.keys(result.results[0]??{}),...rows]:rows;}
    return result;
   };
   const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});statements.set(wrapped,{original,sql});return wrapped;
 }
 const db=new Proxy(database,{get(target,key){
  if(key==='prepare')return(sql:string)=>wrap(target.prepare(sql),sql);
  if(key==='batch')return execute;
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 originals.set(db,database);bindings.set(database,db);return db;
}
