export type CsvRecord = Record<string, string>;

/** RFC 4180 records, including embedded newlines and doubled quotation marks. */
export function csvRows(csv: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false; let closed = false;
  const input = csv.replace(/^\uFEFF/u, '');
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(field); field = ''; closed = false;
      if (char !== ',') { if (row.some(Boolean)) rows.push(row); row = []; if (char === '\r' && input[index + 1] === '\n') index++; }
    } else if (char === '"' && !field) quoted = true;
    else { if (closed && char.trim()) throw new Error('CSV contains text after a quoted field.'); field += char; }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(field); if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function parseCsv(csv: string): CsvRecord[] {
  const rows = csvRows(csv);
  if (rows.length < 2) throw new Error('CSV must include a header and at least one row.');
  const headers = rows[0].map(header => header.trim().toLowerCase());
  if (headers.some(header => !header)) throw new Error('CSV has an empty header.');
  if (new Set(headers).size !== headers.length) throw new Error('CSV has duplicate headers.');
  const encodingIndex=headers.indexOf('__mango_csv_encoding');
  return rows.slice(1).map(fields => fields.length !== headers.length
    ? { __parse_error: 'CSV row does not have the same number of fields as the header.' }
    : Object.fromEntries(headers.flatMap((header, index) => {
      const encoded=encodingIndex>=0&&fields[encodingIndex]==='mango-apostrophe-v1';
      if(index===encodingIndex&&encoded)return [];
      const value=fields[index];
      return [[header,encoded&&value.startsWith("'")?value.slice(1):value]];
    })));

}
/** Versioned transport marker makes apostrophe escaping reversible without
 * interpreting an original apostrophe in a foreign CSV as our own escape.
 * Every original field remains available; ledger_json is the lossless ledger.
 */
export function encodeCsv(rows: unknown[][]) {
  return rows.map((row,index) => [...row.map(value=>{
    const text=String(value ?? '');
    return index>0 && (/^[\s]*[=+@-]/u.test(text)||/^[\s]*[\t\r]/u.test(text)||text.startsWith("'"))?"'"+text:text;
  }),index===0?'__mango_csv_encoding':'mango-apostrophe-v1'].map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
}
