import type {ImportInput} from './import-types';
import {iterateCsvRecords} from './csv';
import {normalizedImportRows,restrictiveRank,type NormalizedImportRow} from './import-normalize';
import {maxContactImportRows} from './import-limits';
import {STEP_RECORDS as windowSize} from '@/vendor/base/import-kit/src/d1/preparation-steps';
const identity=(row:NormalizedImportRow)=>row.email||row.phone;
const same=(a:NormalizedImportRow,b:NormalizedImportRow)=>a.file===b.file&&a.row===b.row;

/** Detect the large door without retaining parsed records or normalizing twice. */
export function steppedReviewRequired(input:ImportInput){
  let count=0;
  const threshold=input.sourceExtras||input.files.some(file=>!file.preset.startsWith('csv-'))?50_000:windowSize;
  for(const file of input.files)for(const _ of iterateCsvRecords(file.csv))if(++count>threshold)return true;
  return false;
}

/** Keep only one native mapping window. Canonical duplicates and conflicting
 * phone assignments are resolved across the complete review, before any step. */
export function selectedRows(input:ImportInput,from:number){
  const first=new Set<string>(),duplicates=new Set<string>(),phones=new Map<string,string>(),conflicts=new Set<string>();
  const selected:NormalizedImportRow[]=[];
  let total=0;
  for(const row of normalizedImportRows(input)){
    if(total>=from&&total<from+windowSize)selected.push(row);
    if(!row.reason&&!row.optOuts){
      const key=identity(row);
      if(first.has(key))duplicates.add(key);else first.add(key);
      if(row.phone&&row.email){const email=phones.get(row.phone);if((email!==undefined&&email!==row.email)||first.has(row.phone))conflicts.add(row.phone);else phones.set(row.phone,row.email);}
      else if(row.phone&&phones.has(row.phone))conflicts.add(row.phone);
    }
    total++;
  }
  if(total>maxContactImportRows)throw new Error('The CSV exceeds the reviewed capacity.');
  const combined=new Map<string,NormalizedImportRow>();
  if(duplicates.size)for(const row of normalizedImportRows(input)){
    const key=identity(row);if(row.reason||!duplicates.has(key))continue;
    const prior=combined.get(key);
    if(prior){
      if(prior.phone!==row.phone){prior.reason=row.reason='Duplicate identity has conflicting phone and email assignments. Resolve the identities explicitly.';}
      const name=prior.displayName.trim().length>=row.displayName.trim().length?prior.displayName:row.displayName;
      prior.sourceDisplayName??=prior.displayName;row.sourceDisplayName=row.displayName;prior.displayName=row.displayName=name;
      if(restrictiveRank[row.smsStatus]>restrictiveRank[prior.smsStatus]){prior.smsStatus=row.smsStatus;prior.values={...prior.values,...Object.fromEntries(Object.entries(row.values).filter(([key])=>key.startsWith('sms_')))};}
      if(restrictiveRank[prior.smsStatus]>restrictiveRank[row.smsStatus]){row.smsStatus=prior.smsStatus;row.values={...row.values,...Object.fromEntries(Object.entries(prior.values).filter(([key])=>key.startsWith('sms_')))};}
    }
    if(!prior||restrictiveRank[row.status]>restrictiveRank[prior.status])combined.set(key,row);
  }
  for(const row of selected){
    if(row.reason)continue;
    const winner=combined.get(identity(row));
    if(winner?.reason)row.reason=winner.reason;
    else if(winner){
      if(same(row,winner))Object.assign(row,winner);
      else {row.skipped='Duplicate destination combined with its most restrictive channel statuses in this import.';row.warnings.push(row.skipped);}
    }
    if(conflicts.has(row.phone))row.reason='Phone appears with different email identities. Resolve the identities explicitly.';
  }
  return {rows:selected,total,identities:[...new Set([...first,...phones.keys()])]};
}

