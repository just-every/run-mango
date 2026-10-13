/** SQLite script reader for integration tests, including quoted semicolons and triggers. */
export function sqlStatements(source) {
  const statements = []; let start = 0, quote = '', comment = '', word = '', trigger = false, block = false;
  function token() {
    if (word.toUpperCase() === 'TRIGGER') trigger = true;
    if (trigger && word.toUpperCase() === 'BEGIN') block = true;
    if (trigger && word.toUpperCase() === 'END') block = false;
    word = '';
  }
  for (let i = 0; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (comment) { if (comment === '--' && c === '\n') comment = ''; else if (comment === '/*' && c === '*' && next === '/') { comment = ''; i++; } continue; }
    if (quote) { if (c === quote) { if (next === quote) i++; else quote = ''; } continue; }
    if (c === '-' && next === '-') { token(); comment = '--'; i++; continue; }
    if (c === '/' && next === '*') { token(); comment = '/*'; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { token(); quote = c; continue; }
    if (/[A-Za-z_]/.test(c)) { word += c; continue; }
    token();
    if (c === ';' && !block) { const sql = source.slice(start, i + 1).trim(); if (sql) statements.push(sql); start = i + 1; trigger = false; }
  }
  const rest = source.slice(start).replace(/--[^\n]*/g, '').trim();
  if (rest) throw new Error('Incomplete SQL migration.');
  return statements;
}
