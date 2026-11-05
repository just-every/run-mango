import json,re,subprocess,sys
from pathlib import Path

def git(*args):return subprocess.check_output(['git',*args],text=True)
text=git('log','origin/main..HEAD','--format=%an <%ae>%n%cn <%ce>%n%(trailers:only,unfold)')
print(text,end='')
commits=git('rev-list','origin/main..HEAD').splitlines()
rows=[]
for sha in commits:
    raw=git('show','-s','--format=%an%n%ae%n%cn%n%ce%n%B',sha)
    an,ae,cn,ce,msg=raw.split('\n',4)
    if an!='Run Edit Run fleet' or cn!='Run Edit Run fleet' or ae!='fleet@runeditrun.com' or ce!='fleet@runeditrun.com':raise SystemExit('candidate identity rejected '+sha)
    trailers=subprocess.check_output(['git','interpret-trailers','--parse'],input=msg,text=True)
    for address in re.findall(r'<([^<>]+)>',trailers):
        if address.lower() not in {'fleet@runeditrun.com','noreply@anthropic.com','noreply@openai.com'}:raise SystemExit('candidate trailer address rejected '+sha)
    if re.search(r'(?im)^\s*co-authored-by:.*(?:codex|noreply@openai\.com)',msg):raise SystemExit('candidate OpenAI/Codex co-author rejected '+sha)
    rows.append({'sha':sha,'author':f'{an} <{ae}>','committer':f'{cn} <{ce}>','trailers':trailers})
hooks=git('config','--get','core.hooksPath').strip()
if not Path(hooks,'commit-msg').is_file():raise SystemExit('fleet hook missing')
result={'head':git('rev-parse','HEAD').strip(),'command':'git log origin/main..HEAD --format="%an <%ae>%n%cn <%ce>%n%(trailers:only,unfold)"','candidate_count':len(rows),'candidates':rows,'hook':hooks,'passed':True}
Path(sys.argv[1]).write_text(json.dumps(result,indent=2)+'\n')
print('candidate identity/trailers PASS count='+str(len(rows)))
