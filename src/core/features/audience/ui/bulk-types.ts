export type Hit={id:string;displayName:string;email:string|null;phone:string|null;emailStatus:string;smsStatus:string;tags:string[]};
export type BulkAction='tag'|'untag'|'export'|'suppress'|'erase'|'add-to-topic';
export type BulkReceipt={id:string;action:BulkAction;state:'preparing'|'running'|'complete'|'failed';params:Record<string,string>;total:number;processed:number;succeeded:number;refused:number;
  error:string|null;completedAt:string|null;refusedContacts:{contactId:string;name:string;email:string|null;reason:string}[];refusedNext:number|null};
export const actionLabels:Record<BulkAction,string>={tag:'Add tag',untag:'Remove tag',export:'Export CSV',suppress:'Suppress',erase:'Erase','add-to-topic':'Add to topic'};
export const reasonCopy:Record<string,string>={
  no_covering_consent:'No confirmed consent covers this topic',contact_missing:'No longer exists',merge_in_progress:'Being merged',
  imported_tag_kept:'Tag came with an imported profile and stays',no_destination:'Has no address or number',ambiguous_text:'A kept record names them in text that cannot be removed safely',
};
