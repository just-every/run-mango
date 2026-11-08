"""One REST watcher for exact-head Verify, with a shared ten-call budget."""
import datetime,json,os
from pathlib import Path
import subprocess,sys,time

sha=sys.argv[1]
packet=Path(sys.argv[2])
state_path=packet/'ci-receipt.json'
state={'repository':'just-every/run-mango','head':sha,'calls':[],'status':'watching'}

def save():
 state_path.write_text(json.dumps(state,indent=2)+'\n')

def gh_api(endpoint):
 if len(state['calls'])>=10: raise RuntimeError('GitHub ten-call budget exhausted')
 values=dict(line.rstrip('\n').split('=',1) for line in (Path.home()/'.rer-cloud.env').open() if '=' in line)
 env=dict(os.environ,GH_TOKEN=values['GH_TOKEN'])
 call={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':'gh api '+endpoint}
 state['calls'].append(call)
 save()
 result=subprocess.run(['gh','api',endpoint],env=env,capture_output=True,text=True,timeout=180)
 call['exit']=result.returncode
 if result.returncode:
  call['error']=result.stderr.replace(values['GH_TOKEN'],'<REDACTED>')
  save()
  raise RuntimeError('GitHub API failed; bounded credential recovery required')
 return json.loads(result.stdout)

run_id=None
try:
 while len(state['calls'])<8:
  if run_id is None:
   result=gh_api('repos/just-every/run-mango/actions/runs?head_sha='+sha+'&per_page=100')
   rows=[r for r in result['workflow_runs'] if r['head_sha']==sha and r['name']=='Verify' and r['event']=='push']
   if rows:
    run=max(rows,key=lambda r:r['id'])
    run_id=run['id']
   else:
    state['discovery']='No exact-SHA push Verify advertised yet'
    save()
    print(state['discovery'],flush=True)
    for _ in range(10): time.sleep(30)
    continue
  else:
   run=gh_api('repos/just-every/run-mango/actions/runs/'+str(run_id))
  row={k:run[k] for k in ['id','status','conclusion','head_sha','html_url']}
  if row['head_sha']!=sha: raise RuntimeError('Refused workflow from a different SHA')
  state['run']=row
  print('CI '+json.dumps(row),flush=True)
  save()
  if row['status']=='completed':
   state['status']='success' if row['conclusion']=='success' else 'failed'
   save()
   break
  for _ in range(10): time.sleep(30)
 else:
  state['status']='budget-reserved-for-diagnostics'
  save()
except Exception as error:
 state['status']='watch-error'
 state['error']=str(error)
 save()
 print('CI_WATCH_ERROR '+str(error),flush=True)
 raise
