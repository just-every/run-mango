import {erasureWriteCost} from './erasure/write-fence';
// D1 Paid permits 1,000 SQL statements per invocation, including each batch member.
// Count actual preview reads and writes, and reserve readback before custody commits.
export function audiencePreviewBudget(database: D1Database) {
  // Reserve request generation, sender/session/projection and maintenance reads,
  // including the two same-transaction guards around the operator projection.
  let spent = 8;
  const originals = new WeakMap<object,D1PreparedStatement>();
  function assertAvailable(count: number) {
    if (spent + count > 1000) throw new Error('Audience import preview exceeds the D1 request budget for this payload. Split the CSV into smaller files.');
  }
  function charge(count: number) { assertAvailable(count); spent += count; }
  function wrap(statement: D1PreparedStatement,sql:string): D1PreparedStatement {
    const wrapped = new Proxy(statement, {get(target,key) {
      if (key === 'bind') return (...values: unknown[]) => wrap(target.bind(...values),sql);
      if (['all','first','run','raw'].includes(String(key))) return (...args: unknown[]) => {
        charge(1+erasureWriteCost(sql));
        return (target[key as keyof D1PreparedStatement] as Function).apply(target,args);
      };
      const value = Reflect.get(target,key);
      return typeof value === 'function' ? value.bind(target) : value;
    }});
    originals.set(wrapped,statement);
    return wrapped;
  }
  const db = new Proxy(database, {get(target,key) {
    if (key === 'prepare') return (sql: string) => wrap(target.prepare(sql),sql);
    if (key === 'batch') return (statements: D1PreparedStatement[]) => {
      charge(statements.length+2);
      return target.batch(statements.map(statement => originals.get(statement)!));
    };
    const value = Reflect.get(target,key);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
  return {db,assertAvailable};
}
export type AudiencePreviewBudget = ReturnType<typeof audiencePreviewBudget>;
