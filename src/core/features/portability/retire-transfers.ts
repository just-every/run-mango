/** Finish migration 0044's dynamic-table/R2 retirement before serving work.
 * Each page is idempotent across interruption or concurrent requests. SQL has
 * already revoked jobs and raised every known source floor before this runs. */
export async function retireTransfers(db: D1Database, buckets: Record<string, Pick<R2Bucket, 'delete'>>) {
  const readTables = () => db.prepare('SELECT name FROM rer_portability_retired_copies LIMIT 100').all<{name: string}>();
  const readObjects = () => db.prepare('SELECT bucket,key FROM rer_portability_retired_objects LIMIT 25').all<{bucket: string; key: string}>();
  // The inventories are independent. Keep retirement and failure order intact,
  // while the usual empty case needs only one read phase.
  const [tables, objects] = await Promise.allSettled([readTables(), readObjects()]);
  if (tables.status === 'rejected') throw tables.reason;
  let tableRows = tables.value.results;
  for (;;) {
    const rows = tableRows;
    if (!rows.length) break;
    await db.batch(rows.flatMap(({ name }) => {
      if (!/^rer_portability_(snap|stage)_/.test(name)) throw new Error('Invalid retired transfer table');
      return [db.prepare(`DROP TABLE IF EXISTS "${name.replaceAll('"', '""')}"`), db.prepare('DELETE FROM rer_portability_retired_copies WHERE name=?').bind(name)];
    }));
    tableRows = (await readTables()).results;
  }
  if (objects.status === 'rejected') throw objects.reason;
  let objectRows = objects.value.results;
  for (;;) {
    const rows = objectRows;
    if (!rows.length) return;
    for (const row of rows) {
      const bucket = buckets[row.bucket];
      if (!bucket) throw new Error('Retired transfer bucket unavailable');
      await bucket.delete(row.key);
      await db.prepare('DELETE FROM rer_portability_retired_objects WHERE bucket=? AND key=?').bind(row.bucket, row.key).run();
    }
    objectRows = (await readObjects()).results;
  }
}
