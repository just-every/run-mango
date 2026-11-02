/** A current synthetic account policy whose next window is tomorrow. The
 * native worker must retain, defer and recheck the confirmation, never send it. */
export default function(){
 const now=Date.now(),day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US',{timeZone:'Australia/Brisbane',weekday:'short'}).format(now));
 const windows=[{days:[(day+1)%7],startMinute:540,endMinute:1200}];
 return JSON.stringify({brand:'Orchard newsletter',programme:'News',category:'newsletter',frequency:'Weekly',jurisdiction:'AU',
  support:'help@example.test',providerAlreadyReplies:false,policySource:'https://provider-evidence.example.test/quiet-window',
  policyVerifiedAt:new Date(now-60000).toISOString(),policyExpiresAt:new Date(now+86400000).toISOString(),
  providerWindows:windows,jurisdictionWindows:windows,recipientWindows:windows});
}
