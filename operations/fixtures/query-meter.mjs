// Native D1 instrumentation. Statements and results remain the real binding's.
export function queryMeter(database) {
  let queries=0;
  const originals=new WeakMap();
  const charge=count=>{queries+=count;};
  function wrap(statement){
    const proxy=new Proxy(statement,{get(target,key){
      if(key==='bind')return(...values)=>wrap(target.bind(...values));
      if(['first','all','run','raw'].includes(key))return(...values)=>{charge(1);return target[key](...values);};
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});originals.set(proxy,statement);return proxy;
  }
  const db=new Proxy(database,{get(target,key){
    if(key==='prepare')return sql=>wrap(target.prepare(sql));
    if(key==='batch')return statements=>{charge(statements.length);return target.batch(statements.map(statement=>originals.get(statement)??statement));};
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
  return {db,count:()=>queries};
}
