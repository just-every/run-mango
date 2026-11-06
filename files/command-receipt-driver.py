import datetime, hashlib, json, os, pathlib, subprocess, sys, time
packet=pathlib.Path.home()/'rer-consolidation/work/ct-judge-mango-design003-fix1-20261105-2221-sol1/packet'
name=sys.argv[1]; command=sys.argv[2:]; start=time.monotonic(); before=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (packet/(name+'.log')).open('w') as log:
    result=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT)
record=dict(name=name,command=command,exit=result.returncode,seconds=round(time.monotonic()-start,3),started=started,ended=datetime.datetime.now(datetime.timezone.utc).isoformat(),head=before,home_matches_account_home=__import__('pwd').getpwuid(os.getuid()).pw_dir==str(pathlib.Path.home()))
(packet/(name+'-receipt.json')).write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record),flush=True)
sys.exit(result.returncode)
