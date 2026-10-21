import { statement, quote, insist } from './storage.mjs';
import { tokens, identifier, folded } from './generated.mjs';
import { changesData, dataStatement, reachingTables, triggerBodies, schemaChange, statementNames } from './migration-statements.mjs';
import { splitStatements } from './sql-text.mjs';
import { preservingRebuilds } from './rebuilds.mjs';
import { replayViews, viewReads } from './replay-views.mjs';

// The data statements of later migrations, judged by the tables they write
// (bridge.mjs placement). Restored rows never pass through a later migration.
// - A bounded INSERT, REPLACE, UPDATE or DELETE whose target lies outside the
//   restorable catalogue (an excluded, derived or platform table) and whose
//   writes reach no catalogue table through a trigger or foreign key action
//   (reachingTables) changes no restored row, whatever it reads: admitted.
// - An eligible seed or backfill of a catalogue table replays at finalize.
//   A carried table keeps its archived rows and admits only one later writer,
//   naming its target columns. An absent table is reset first; each later write is a
//   replayable INSERT: they run in migration order, exactly as written, after
//   the archived rows are inserted and with the destination's triggers still
//   dropped, so the table holds what the live upgrade gave it. A replay may read
//   only archived tables (complete by then), views over those tables and the
//   table itself, by named
//   columns that are not secret; no trigger on the table may write a catalogue
//   table; no later statement may write it another way (directly or through a
//   trigger) or change its columns other than by ADD COLUMN.
// - Everything else keeps today's rule (changesData), with the tables admitted
//   writes fill from archived rows counted as archived: copying one into a
//   catalogue table is refused, since the restore does not hold its live rows.
// Each chunk the runner's splitter handed over is split again at SQLite's own
// statement boundaries first (sql-text.mjs), so a trigger glued to the
// statements after it is judged as the statements it holds.
// Returns the replays in migration order and the proven CHECK rebuilds, or refuses with the first migration
// (in `unapplied` order) holding a statement that cannot be admitted.
export function laterData({applied,unapplied,replay,catalogue,archived,empty,tables,secrets,manifest}) {
  const split=name=>replay.statements(name).flatMap(splitStatements),fold=list=>list.map(folded);
  const statements=applied.flatMap(split);
  const restorable=fold(catalogue),carried=fold(archived);
  const reached=reachingTables(statements,carried),writable=reachingTables(statements,restorable);
  const later=unapplied.flatMap(migration=>split(migration).map((sql,index)=>({migration,index,sql,data:dataStatement(sql)})));
  const {admitted,tables:rebuilt}=preservingRebuilds(later,manifest,tables,statements),views=replayViews(statements);
  const known=fold(tables),outside=later.filter(s=>s.data && !writable.includes(s.data.target)),tainted=new Set();
  // Mango: a table the applied history created and then dropped (a migration's
  // own staging table) does not exist at finalize, so no write reading it can
  // replay there; such a write keeps today's admission rule instead.
  const dropped=createdTables(statements).filter(name=>!known.includes(name));
  // Tables an admitted write fills from archived rows (directly, through its
  // target's triggers, or from another such table) hold rows the restore lacks.
  const taint=name=>{if(known.includes(name) && !tainted.has(name)){tainted.add(name);triggerBodies(statements,name).forEach(taint);return true;}};
  for(let grew=true;grew;)grew=outside.filter(s=>s.data.names.some(name=>carried.includes(name) || tainted.has(name))).map(s=>taint(s.data.target)).some(Boolean);
  const refused=new Set(),writes=new Map();
  for(const s of later) {
    if(outside.includes(s) || admitted.has(s))continue;
    s.today=changesData(s.sql,[...reached,...tainted],empty);
    if(s.data && restorable.includes(s.data.target)){if(!writes.has(s.data.target))writes.set(s.data.target,[]);writes.get(s.data.target).push(s);}
    else if(s.today)refused.add(s);
  }
  const replays=[];
  for(const [table,list] of writes) {
    // Seed INSERTs into a new table replay too: the rows already present in a
    // fresh destination must be reset and derived from the restored installation.
    const bad=carried.includes(table) && list.length>1?list:list.filter(s=>!replayable(s,{table,statements,restorable,writable,carried,tables:known,secrets,views,manifest,dropped}));
    // Writes confined to tables created after the archive retain their
    // admission. Replay eligible seeds, but do not turn a new-table-only
    // upgrade into a refused backfill. View reads always require resolution.
    const required=list.some(s=>s.today || s.data.names.some(name=>views.has(name)));
    if(!required && bad.length)continue;
    const reach=reachingTables(statements,[table]),other=later.filter(s=>!admitted.has(s) && !list.includes(s) && writesAnother(s,table,reach,list));
    if(bad.length || other.length){[...bad,...other].forEach(s=>refused.add(s));continue;}
    replays.push(...list);
  }
  const first=later.find(s=>refused.has(s));
  insist(!first,'schema_mismatch:migration_data:'+first?.migration);
  const named=Object.fromEntries(catalogue.map(name=>[folded(name),name]));
  return {rebuilt,replays:later.filter(s=>replays.includes(s)).map(s=>({migration:s.migration,statement:s.index,table:named[s.data.target],sql:s.sql,...(carried.includes(s.data.target)?{carried:true}:{})}))};
}
function replayable({data},{table,statements,restorable,writable,carried,tables,secrets,views,manifest,dropped}) {
  if(!['insert','replace'].includes(data.verb) || data.star || data.names.some(name=>dropped.includes(name)))return false;
  if(carried.includes(table)) {
    // sqlite_sequence's high-water mark is not archived, so replay cannot
    // reproduce a carried AUTOINCREMENT table's live key allocation.
    if(!data.columns || autoincrement(manifest.find(t=>folded(t.name)===table).sql))return false;
    // Keyed tables carry their key columns, not their hidden physical rowids.
    // Treat unarchived aliases as unreadable cells, including through views.
    secrets={...secrets};
    for(const t of manifest)if(!t.rowidAlias) {
      const hidden=['rowid','_rowid_','oid'].filter(name=>!t.columns.some(c=>folded(c.name)===name));
      secrets[t.name]=[...(secrets[t.name]??[]),...hidden];
    }
  }
  // A carried target participates in secret checks, even through a view.
  if(!viewReads(data.names,data.words,{views,tables,carried,table:carried.includes(table)?undefined:table,secrets}))return false;
  if(triggerBodies(statements,table).some(name=>writable.includes(name)))return false;
  // Foreign key actions: a row the replay deletes or rekeys (REPLACE, upsert) must reach no other catalogue table.
  return !reachingTables(statements,restorable.filter(name=>name!==table)).includes(table);
}
// Whether a later statement other than the table's replays writes it, through a
// trigger as well, or changes its columns other than by ADD COLUMN.
function writesAnother(s,table,reach,replays) {
  if(s.data)return reach.includes(s.data.target);
  if(!statementNames(s.sql).includes(table))return false;
  const shape=schemaChange(s.sql);
  if(shape==='add column')return !replays.every(r=>r.data.columns);
  return !['create table','create index','drop index','create view','drop view','trigger'].includes(shape);
}
// Finalize statements for the job's replays, to run after the archived rows are
// inserted and before the triggers are recreated. Only absent tables are emptied
// (and their AUTOINCREMENT counters reset, as the live upgrade created them).
// Carried tables keep their archived rows. Statements run in migration order,
// recording rows in the job's bridge record (`replayed[i].rows`) in the same transaction.
export function replayStatements(db,row) {
  const replays=row.metadata.replays??[];
  const reset=[...new Set(replays.filter(r=>!r.carried).map(r=>r.table))].flatMap(name=>{
    const target=row.metadata.targets.find(t=>t.name===name);
    insist(target,'schema_mismatch:replay_table:'+name);
    return [statement(db,`DELETE FROM ${quote(name)}`),...(autoincrement(target.sql)?[statement(db,'DELETE FROM sqlite_sequence WHERE name=?',name)]:[])];
  });
  return [...reset,...replays.flatMap((r,i)=>[db.prepare(r.sql),
    statement(db,`UPDATE rer_portability_jobs SET metadata=json_set(metadata,'$.bridge.replayed[${i}].rows',changes()) WHERE id=?`,row.id)])];
}
const autoincrement=sql=>tokens(sql).some(t=>!t.quoted && folded(t.text)==='autoincrement');
// The tables CREATE TABLE statements declare, folded.
const createdTables=statements=>statements.flatMap(sql=>{
  const list=tokens(sql),words=list.map(t=>t.quoted?undefined:folded(t.text));
  const at=words[1]==='table'?2:['temp','temporary'].includes(words[1]) && words[2]==='table'?3:-1;
  if(words[0]!=='create' || at<0)return [];
  const name=list[words[at]==='if'?at+3:at];
  return name?[folded(identifier(name))]:[];
});
