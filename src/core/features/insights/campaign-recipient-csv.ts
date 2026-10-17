/** Quoted CSV with the same reversible spreadsheet-safety marker as audience exports. */
export function campaignReportCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]) {
  const quote=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
  const cell=(value:unknown)=>{const text=String(value??'');return quote(/^[\s]*[=+\-@\t\r]/u.test(text)||text.startsWith("'")?`'${text}`:text);};
  const output:string[]=[];
  if(headers.length)output.push([...headers,'__mango_csv_encoding'].map(quote).join(','));
  for(const row of rows)output.push([...row.map(cell),quote('mango-apostrophe-v1')].join(','));
  return output.join('\r\n')+'\r\n';
}
export function campaignReportCsvResponse(csv:string,filename:string) {
  return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${filename.replace(/[^a-zA-Z0-9_.-]/g,'_')}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
