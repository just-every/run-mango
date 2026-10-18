export const mailboxProviders = ['Gmail','Outlook and Hotmail','Yahoo and AOL','Apple iCloud','Other'] as const;
export const bounceCategories = ['invalid-address','mailbox-full','policy-block','reputation','content','other'] as const;
export type MailboxProvider = typeof mailboxProviders[number];
export type BounceCategory = typeof bounceCategories[number];
export const bounceLabels:Record<BounceCategory,string>={'invalid-address':'Invalid address','mailbox-full':'Mailbox full','policy-block':'Policy block',reputation:'Reputation',content:'Content',other:'Other / reason not recorded'};
/** Exact destination domains, never an inference about a custom domain's hosting or MX records. */
export function mailboxSql(destination:string) {
  const domain=`lower(substr(${destination},instr(${destination},'@')+1))`;
  return `CASE WHEN ${domain} IN ('gmail.com','googlemail.com') THEN 'Gmail'
    WHEN ${domain} IN ('outlook.com','hotmail.com','live.com','msn.com') THEN 'Outlook and Hotmail'
    WHEN ${domain} IN ('yahoo.com','ymail.com','rocketmail.com','aol.com') THEN 'Yahoo and AOL'
    WHEN ${domain} IN ('icloud.com','me.com','mac.com') THEN 'Apple iCloud' ELSE 'Other' END`;
}
/** Named, signed diagnostic fields only. A provider's explicit classification takes precedence over SMTP text. */
export function bounceCategorySql(detail:string) {
  const field=(name:string)=>`lower(COALESCE(json_extract(${detail},'$.${name}'),''))`;
  const classification=field('bounceClassification');
  const text=['bounceClassification','reason','response','status','bounceSubtype'].map(field).join(" || ' ' || ");
  const contains=(terms:string[])=>terms.map(term=>`instr((${text}),'${term}')>0`).join(' OR ');
  return `CASE
    WHEN ${classification}='invalid address' THEN 'invalid-address'
    WHEN ${classification}='reputation' THEN 'reputation'
    WHEN ${classification}='content' THEN 'content'
    WHEN ${contains(['5.1.1','5.1.0','invalid address','user unknown','no such user','recipient not found','does not exist'])} THEN 'invalid-address'
    WHEN ${contains(['4.2.2','5.2.2','mailbox full','over quota','overquota','quota exceeded'])} THEN 'mailbox-full'
    WHEN ${contains(['reputation','blacklist','blocklist','spamhaus'])} THEN 'reputation'
    WHEN ${contains(['content','message rejected as spam'])} THEN 'content'
    WHEN ${contains(['5.7.','policy','blocked'])} THEN 'policy-block'
    ELSE 'other' END`;
}
