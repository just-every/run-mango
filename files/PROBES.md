Candidate e5ddac0129a005f30daa5749ab5f5308196ee7f8; exact candidate test command passed with exit 0.

PROBE CAMP-004 acceptance-5 missing sender: native PATCH with empty sender name and checks -> saved draft, named message.email-identity blocker with two eligible contacts

PROBE CAMP-004 acceptance-4 missing sender refusal: native approve -> HTTP 409 with all current blockers; campaign, revision, steps and links unchanged; no approval receipt, recipients, dispatch, jobs or marketing handoff

PROBE CAMP-004 acceptance-5 correction: native PATCH restoring configured sender and checks -> no blockers; campaign remains draft without approval or sending authority

PROBE CAMP-004 acceptance-5 missing from email: native save and checks -> named blocker; approve -> 409, unchanged draft and no authority; correction -> clear without approving

PROBE CAMP-004 acceptance-5 missing reply-to email: native save and checks -> named blocker; approve -> 409, unchanged draft and no authority; correction -> clear without approving

PROBE CAMP-004 acceptance-5 missing postal address: native save and checks -> named blocker; approve -> 409, unchanged draft and no authority; correction -> clear without approving

PROBE CAMP-004 acceptance-2 message.email-identity: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 message.email-identity: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 message.email-identity: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 message.personalisation: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 message.content: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 message.links: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 message.links: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 message.links: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 message.content: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 message.email-consent-scope: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 schedule.steps: saved native draft -> named blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-3 mail.sender.v1.configured: unavailable provider guarantee -> approval 409 with unchanged draft and no authority

PROBE CAMP-004 acceptance-3 mail.sender.v1.configured: unavailable provider guarantee -> approval 409 with unchanged draft and no authority

PROBE CAMP-004 acceptance-3 mail.sender.v1.deduplication: unavailable provider guarantee -> approval 409 with unchanged draft and no authority

PROBE CAMP-004 acceptance-3 mail.sender.v1.deduplication-window: unavailable provider guarantee -> approval 409 with unchanged draft and no authority

PROBE CAMP-004 acceptance-3 mail.sender.v1.reconciliation: unavailable provider guarantee -> approval 409 with unchanged draft and no authority

PROBE CAMP-004 acceptance-3 mail.sender.v1.reconciliation: unavailable provider guarantee -> approval 409 with unchanged draft and no authority

PROBE CAMP-004 acceptance-3 delivery-events-missing: unavailable provider guarantee -> approval 409 with unchanged draft and no authority

PROBE CAMP-004 acceptance-1 spf: failed receiver evidence -> named authentication blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-1 dkim: failed receiver evidence -> named authentication blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-1 dmarc: failed receiver evidence -> named authentication blocker, approval 409 and no authority

PROBE CAMP-004 acceptance-2 compliance: historical saved mail without managed unsubscribe or postal footer -> approval 409 with both named blockers and no authority; native resave repairs readiness only

PROBE CAMP-004 acceptance-4 simultaneous failures: native approval -> all missing fields named together, unchanged draft and no authority

PROBE CAMP-004 acceptance-1 sender authority: withdrawal after valid inspection -> atomic approval conflict, unchanged draft and no authority; repeated review remains blocked until fresh receiver evidence

PROBE CAMP-004 acceptance-1 audience and consent: native unsubscribe during approval -> atomic conflict, unchanged draft and no authority; replay retains opt-out, fresh review contains only the eligible control

PROBE CAMP-004 corrected approval: native approval -> immutable receipt and exact digest, one eligible control recipient and one dispatch command; replay creates no extra authority and the opted-out contact stays excluded
