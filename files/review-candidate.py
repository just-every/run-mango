import hashlib,json,re,subprocess,sys
from pathlib import Path

def git(*args):return subprocess.check_output(['git',*args],text=True)
source='9b9f3867af955c390b39b740b89f96b4ef929ed1'
original=git('show',source+':CONTRACT.md');main=git('show','origin/main:CONTRACT.md');current=Path('CONTRACT.md').read_text()
def rows(text):
    text=text.split('\n## Status\n',1)[1]
    return {m[1]:m[0] for m in re.finditer(r'^\| `([^`]+)` \|.*$',text,re.M)}
o,m,c=map(rows,[original,main,current])
assert set(o)==set(m)==set(c)
changed_main=[k for k in m if m[k]!=c[k]]
assert changed_main==['DESIGN-003'],changed_main
changed_original=[k for k in o if o[k]!=c[k]]
assert set(changed_original)=={'DESIGN-003','PROP-008'},changed_original
assert c['PROP-008']==m['PROP-008']
assert ' | partial | ' in c['DESIGN-003'] and 'R2–R5 MET' in c['DESIGN-003']
def clause(text):return text.split('#### DESIGN-003 — Design data and records\n',1)[1].split('\n#### DESIGN-011',1)[0]
assert clause(original)==clause(main)==clause(current)
registration='tests/campaign-authoring/design-generation.spec.ts'
assert Path(registration).read_text()==git('show',source+':'+registration)
for p in ['tests/campaign-authoring/design-retention.ts','tests/support/fake-twelve-ui.ts']:
    assert Path(p).read_text()==git('show',source+':'+p)
for p in ['ACCEPTANCE.md','docs/CLAIMS.md']:
    assert Path(p).read_text()==git('show','origin/main:'+p)
counts={}
for label,text in [('original',original),('main',main),('candidate',current)]:
    rs=list(rows(text).values())
    counts[label]={kind:{state:sum((' | '+state+' | ') in x and (kind=='all' or ' | published | ' in x) for x in rs) for state in ['done','partial','missing']} for kind in ['published','all']}
report={'passed':True,'source':source,'main':git('rev-parse','origin/main').strip(),'status_rows':len(c),'changed_rows_from_main':changed_main,'changed_rows_from_original':changed_original,'newer_PROP008_retained':True,'DESIGN003_full_clause_unchanged':True,'R2_R5_original_judgment_frozen':True,'registration_and_deadline_unchanged':True,'retention_and_fake_unchanged_from_original':True,'views_equal_main':True,'counts':counts,'files':{p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in ['src/core/features/design-generation/model.ts','tests/campaign-authoring/design-generation.flow.ts','CONTRACT.md','sources.lock.json']}}
Path('../packet/review-receipt.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
