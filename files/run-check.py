import datetime,hashlib,json,pathlib,subprocess,sys,time
receipt,log,*command=sys.argv[1:]
if command[0]=='--': command=command[1:]
start=datetime.datetime.now(datetime.timezone.utc).isoformat(); clock=time.monotonic()
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
diff=subprocess.check_output(['git','diff','--binary','HEAD'])
tracked=['src/core/features/design-generation/model.ts','tests/campaign-authoring/design-generation.flow.ts','CONTRACT.md','sources.lock.json']
files={p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in tracked}
with open(log,'w') as output:
    result=subprocess.run(command,stdout=output,stderr=subprocess.STDOUT)
row={'command':command,'cwd':str(pathlib.Path.cwd()),'head':head,'working_diff_sha256':hashlib.sha256(diff).hexdigest(),'file_sha256':files,'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'duration_seconds':round(time.monotonic()-clock,3),'exit_code':result.returncode,'log':str(pathlib.Path(log).resolve()),'log_sha256':hashlib.sha256(pathlib.Path(log).read_bytes()).hexdigest()}
pathlib.Path(receipt).write_text(json.dumps(row,indent=2)+'\n')
print(json.dumps(row,indent=2))
print('\n'.join(pathlib.Path(log).read_text().splitlines()[-48:]))
sys.exit(result.returncode)
