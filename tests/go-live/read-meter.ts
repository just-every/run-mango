/** Counts the rows every statement reads, as D1 bills them (`meta.rows_read`), for one scheduled run or request. */
export function meteredDatabase(database: D1Database) {
  const meter = { rowsRead: 0, statements: 0, bySql: new Map<string, number>(),
    /** The costliest statements, for a failure message. */
    top: () => [...meter.bySql].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([sql, rows]) => `${rows} rows: ${sql.replace(/\s+/g, ' ').slice(0, 90)}`) };
  const count = (sql: string) => (result: { meta?: { rows_read?: number } }) => {
    const rows = result.meta?.rows_read ?? 0;
    meter.rowsRead += rows; meter.statements++; meter.bySql.set(sql, (meter.bySql.get(sql) ?? 0) + rows);
    return result;
  };
  const known = new WeakMap<object, { raw: D1PreparedStatement; sql: string }>();
  const wrap = (raw: D1PreparedStatement, sql: string): D1PreparedStatement => {
    const proxy = new Proxy(raw, { get(target, key) {
    if (key === 'bind') return (...values: unknown[]) => wrap(target.bind(...values), sql);
    if (key === 'all' || key === 'run') return async () => count(sql)(await (target as any)[key]());
    if (key === 'first') return async (column?: string) => {
      const result = await target.all(); count(sql)(result);
      const row = result.results[0] as Record<string, unknown> | undefined;
      return row === undefined ? null : column === undefined ? row : row[column];
    };
    if (key === 'raw') return async (options?: { columnNames?: boolean }) => {
      const result = await target.all(); count(sql)(result);
      const rows = (result.results as Record<string, unknown>[]).map(row => Object.values(row));
      return options?.columnNames ? [Object.keys(result.results[0] ?? {}), ...rows] : rows;
    };
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
    } });
    known.set(proxy, { raw, sql });
    return proxy;
  };
  const proxy = new Proxy(database, { get(target, key) {
    if (key === 'prepare') return (sql: string) => wrap(target.prepare(sql), sql);
    if (key === 'batch') return async (items: D1PreparedStatement[]) => (await target.batch(items.map(item => known.get(item)?.raw ?? item)))
      .map((result, index) => count(known.get(items[index])?.sql ?? 'batch')(result));
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  return { database: proxy, meter };
}
