export type ErasureScope = {
  subject:Record<string,string|number|null>;
  ids: string[]; emails: string[]; phones: string[];
  /** Exact ids, emails and phones: matched anywhere, with identity boundaries. */
  identifiers: string[];
  /** Capture and confirmation IPs. Other people share them, so they are matched
   * only in the contact's own or identifier-attributed rows and never select a row or plan. */
  ips: string[];
  /** Names and personal notes: matched only in the contact's own or identifier-attributed rows. */
  freeText: string[];
  /** Free text too short or single-token to match safely; never matched, refused at admission when needed. */
  unsafeText: string[];
  hashes: string[]; signupHashes: string[]; networkKeys: string[];
  channels: string[]; jobs: string[]; plans: string[]; streams: string[]; stages: string[];
};
export type ErasureReceipt = { reference: string; state: 'pending'|'complete'; requestedAt: string; completedAt: string|null; removed: Record<string,number>; retainedChannels: string[] };
export type ErasureJob = { reference:string; subject_id:string|null; state:string; scope_json:string; counts_json:string; revision:number; stage:number; cursor:number; blob_scan_json:string; requested_at:number; completed_at:number|null };
export type ErasureRow = Record<string,string|number|null>;
