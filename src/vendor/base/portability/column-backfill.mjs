import {tokens,identifier,folded} from './generated.mjs';

// An UPDATE replay may fill one newly added column, never overwrite an archived
// cell or rekey a row. Keep the grammar narrow: a named target and assignment,
// with no top-level FROM, WHERE, RETURNING or second assignment. The caller still
// checks all reads, secrets, triggers, foreign-key effects and later writers.
export function newColumnBackfill(sql,{table,statements,manifest}) {
  const match=/^\s*UPDATE\s+([A-Za-z_][A-Za-z0-9_]*)\s+SET\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]+)$/i.exec(sql);
  if(!match || folded(match[1])!==table)return false;
  const column=folded(match[2]),archived=manifest.find(t=>folded(t.name)===table);
  if(!archived || archived.columns.some(c=>folded(c.name)===column))return false;
  const at=statements.indexOf(sql);
  if(at<0 || !statements.slice(0,at).some(statement=>{
    const list=tokens(statement),words=list.map(t=>t.quoted?undefined:folded(t.text));
    if(words[0]!=='alter'||words[1]!=='table'||folded(identifier(list[2]))!==table||words[3]!=='add')return false;
    const name=list[words[4]==='column'?5:4];
    return name && folded(identifier(name))===column;
  }))return false;
  let depth=0;
  for(const token of tokens(match[3])) {
    if(token.quoted)continue;
    if(token.text==='(')depth++;
    else if(token.text===')'){if(--depth<0)return false;}
    else if(!depth && (token.text===',' || ['from','where','returning','order','limit'].includes(folded(token.text))))return false;
  }
  return depth===0;
}
