import {contactErasureTables} from './declaration';
import {hasLiteral} from './literals';
import {identifierNeedles,unsafeNeedles} from './needles';
import {quote,rowChanges} from './rows';
import type {ErasureRow,ErasureScope} from './types';

/** Before admission, find a store whose kept record would still hold unsafe free
 * text after erasure: the contact's own kept row (recipient, audit) or another
 * record attributed by a raw exact identifier. Returns that store's name. Copies
 * attributed only through an encoded identifier are found during erasure, where
 * unsafe free text is never matched. */
export async function ambiguousFreeTextStore(db:D1Database,scope:ErasureScope):Promise<string|null>{
  if(!scope.unsafeText.length)return null;
  const identifiers=JSON.stringify(scope.identifiers.map(value=>value.toLowerCase()));
  for(const table of contactErasureTables){
    if(!table.literal||table.mode?.startsWith('invalidate-'))continue;
    const columns=(await db.prepare(`PRAGMA table_info(${quote(table.table)})`).all<{name:string}>()).results;
    const where=table.where?.(scope),keepsDirect=table.mode==='audit'||table.mode==='recipient'||table.mode==='redact';
    const attributed=`EXISTS(SELECT 1 FROM json_each(?) n WHERE ${columns.map(column=>`instr(lower(CAST(${quote(column.name)} AS TEXT)),n.value)>0`).join(' OR ')})`;
    let cursor=0;
    while(true){
      const rows=(await db.prepare(`SELECT rowid AS _cursor,${where?`(${where.sql})`:'0'} AS _direct,* FROM ${quote(table.table)} WHERE rowid>? AND (${where&&keepsDirect?`(${where.sql}) OR `:''}${attributed}) ORDER BY rowid LIMIT 100`)
        .bind(...where?.params??[],cursor,...where&&keepsDirect?where.params:[],identifiers).all<ErasureRow&{_direct:number}>()).results;
      if(!rows.length)break;
      for(const {_direct,...row} of rows){
        const direct=Boolean(_direct);
        if(!direct&&!hasLiteral(row,identifierNeedles(scope)))continue;
        const changes=rowChanges(table,row,scope,'admission-check',direct);
        if(changes!=='delete'&&hasLiteral({...row,...changes,_cursor:null},unsafeNeedles(scope)))return table.table;
      }
      cursor=Number(rows.at(-1)!._cursor);
    }
  }
  return null;
}
