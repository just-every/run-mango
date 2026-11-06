import type {csvCounts} from '../move-in/csv-review';
import type {NormalizedImportRow} from './import-normalize';
export const preparationFormat='mango-csv-preparation-v1';
export type Manifest={format:typeof preparationFormat;generation:number;inputHash:string;id?:string;fingerprint?:string;total:number;startPage?:number;counts?:ReturnType<typeof csvCounts>;evidenceKinds?:Record<string,number>;needsRestrictions?:boolean;originals?:Array<{name:string;sha256:string;size:number;chunks:number}>};

export function isPreparedManifest(json:string){return JSON.parse(json).format===preparationFormat;}
export async function generation(db:D1Database){return (await db.prepare('SELECT count(*) AS n FROM audience_erasures').first<{n:number}>())!.n;}
export const publicRow=({values,ledger,optOuts,...row}:NormalizedImportRow)=>({...row,...(optOuts?{optOut:true}:{})});
