import {test,expect} from '@playwright/test';
import {parseCsv,encodeCsv} from '../../src/core/features/audience/csv';
import {normalizeImport} from '../../src/core/features/audience/import-normalize';
test('CONT-010 CSV preserves quoted newlines, quotes, Unicode, CRLF and BOM',()=>{
 const csv='\uFEFFEmail,Display_Name,Consent_Text\r\na@example.test,"Zoë, Test","Line one\r\nLine ""two"""\r\n';
 const rows=parseCsv(csv);expect(rows).toEqual([{email:'a@example.test',display_name:'Zoë, Test',consent_text:'Line one\r\nLine "two"'}]);
 expect(parseCsv(encodeCsv([Object.keys(rows[0]),Object.values(rows[0])]))).toEqual(rows);
 expect(parseCsv('email,name\na@example.test,A\nb@example.test')).toEqual([{email:'a@example.test',name:'A'},{__parse_error:'CSV row does not have the same number of fields as the header.'}]);
 expect(()=>parseCsv('email,email\na,b')).toThrow('duplicate');
});
test('CONT-003/004 preset columns never manufacture missing consent or override restrictive status',()=>{
 const input={files:[{name:'subscribed.csv',preset:'csv-subscribed',csv:'Email Address,Status\na@example.test,cleaned\nb@example.test,unsubscribed\nc@example.test,subscribed'}]};
 const rows=normalizeImport(input).rows;expect(rows.map(row=>row.status)).toEqual(['suppressed','unsubscribed','non-subscribed']);expect(rows[2].warnings).toHaveLength(1);
});
test('CONT-004/006 all source status headers always restrict an incorrectly chosen subscribed preset',()=>{
 const rows=normalizeImport({files:[{name:'wrong-preset.csv',preset:'csv-subscribed',csv:'Email Address,Status,Email Marketing Status,OPTIN_TIME,CONFIRM_TIME\none@example.test,subscribed,unsubscribed,2026-09-01 10:00:00,2026-09-01 10:05:00\ntwo@example.test,subscribed,cleaned,2026-09-01 10:00:00,2026-09-01 10:05:00\nthree@example.test,subscribed,bounced,2026-09-01 10:00:00,2026-09-01 10:05:00'}]}).rows;
 expect(rows.map(row=>row.status)).toEqual(['unsubscribed','suppressed','suppressed']);
});
test('CONT-010 spreadsheet formula neutralization is lossless and distinguishes original apostrophes',()=>{
 const cells=['=SUM(A1:A2)','+61400111222','-1','@cmd','\tcmd','\rcmd','   =1',' \t+1',"'=already escaped","'original",'  ordinary whitespace  '];
 const encoded=encodeCsv([['value'],...cells.map(value=>[value])]);
 for(const dangerous of cells.slice(0,8))expect(encoded).toContain(`"'${dangerous}"`);
 expect(parseCsv(encoded).map(row=>row.value)).toEqual(cells);
});
test('CONT-003 foreign CSV preserves literal apostrophes and whitespace without an export encoding marker',()=>{
 expect(parseCsv('Email Address,First Name\nforeign@example.test,"\'Literal  "')[0]['first name']).toBe("'Literal  ");
 expect(normalizeImport({files:[{name:'foreign.csv',preset:'csv-non-subscribed',csv:'Email Address,First Name\nforeign@example.test,"\'Literal  "'}]}).rows[0].displayName).toBe("'Literal  ");
});
