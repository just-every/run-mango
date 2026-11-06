from pathlib import Path
import json,subprocess,re,hashlib,shutil,datetime
p=Path(__file__).parent
probe=json.loads((p/'design-generation-r1-probe.json').read_text()); requests=json.loads((p/'design-generation-provider-requests.json').read_text())
expected='Good Things Are Ripening\nHello and'
assert probe['retainedBrief']==expected
concept=probe['outbound']['json']['concept']
assert concept.endswith('\n'+expected)
assert not re.search(r'\{|\}|first_name|fallback|friend|unsubscribe_url',concept)
assert not re.search(r'@example\.test|An earlier draft|Seasonal news',json.dumps(probe['outbound']['json']))
creates=[r for r in requests if r['method']=='POST' and r['path']=='/api/v1/create' and 'json' in r]
assert all(not re.search(r'first_name|fallback|friend|unsubscribe_url|@example\.test',json.dumps(r['json'])) for r in creates)
converts=[r for r in requests if r['method']=='POST' and r['path']=='/api/v1/convert']
row=dict(head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),submitted=probe['submittedBrief'],retained=probe['retainedBrief'],outbound=probe['outbound']['json'],request_count=len(requests),post_count=len([r for r in requests if r['method']=='POST']),captured_create_json_count=len(creates),all_create_json_without_contact_audience_token_values=True,conversions=[dict(fields=r.get('fields'),fileSha256=r.get('fileSha256')) for r in converts],note='A refused conversion has no recorded fields because the existing fake refuses before multipart parsing. No empty real-payload inference.')
(p/'R1-payload-inspection.json').write_text(json.dumps(row,indent=2)+'\n')
counts={}
for name,ref in [('original','9b9f3867af955c390b39b740b89f96b4ef929ed1'),('pinned','HEAD'),('merged-main','955785c08ed00910bc83e3aa3bbb0a54703f6f71'),('fresh-main','origin/main')]:
 text=subprocess.check_output(['git','show',ref+':CONTRACT.md'],text=True)
 lines=[l.split('|') for l in text.splitlines() if re.match(r'^\| `[A-Z]+-\d+` \|',l) and len(l.split('|'))>=8]
 counts[name]={scope:{status:sum(1 for l in lines if l[4].strip()==status and (scope=='all' or (l[3].strip()=='published')==(scope=='published'))) for status in ['done','partial','missing']} for scope in ['all','published','target-and-push-further']}
 counts[name]['sha']=subprocess.check_output(['git','rev-parse',ref],text=True).strip()
(p/'counts.json').write_text(json.dumps(counts,indent=2)+'\n')
for name in ['CONTRACT.md','ACCEPTANCE.md','AGENTS.md','RULINGS.md','BASELINE.md','HANDOVER.md','seed.json']:
 shutil.copyfile(name,p/('pinned-'+name))
print(json.dumps(row,indent=2));print(json.dumps(counts,indent=2))
