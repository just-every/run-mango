#!/usr/bin/env bash
set -u
label="$1"
export PATH="$HOME/.rer/node/node-v22.20.0-linux-x64/bin:$PATH"
. /tmp/rer-cloud-toolchain.sh
export CI=true
export WRANGLER_SEND_METRICS=false
export PLAYWRIGHT_SKIP_BROWSER_GC=1
export MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium
export MANGO_TEST_WORK_DIR="$HOME/rer-consolidation/work/sd-mango102-ci-triage-1/runtime/$label"
export MANGO_VERIFY_STAGE=go-live
export MANGO_VERIFY_FILES='["presend-checks.journeys.ts"]'
export MANGO_VERIFY_REPORT_DIRECTORY="$MANGO_TEST_WORK_DIR/evidence/coordinator"
mkdir -p "$MANGO_TEST_WORK_DIR"
python3 - "$label" <<'PY'
import datetime,json,platform,subprocess,sys
from pathlib import Path
label=sys.argv[1]
def run(*args):return subprocess.check_output(args,text=True).strip()
p=Path('../packet')/(label+'-runtime.json')
row={'label':label,'head':run('git','rev-parse','HEAD'),'status_before':run('git','status','--porcelain'),'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runner':platform.node(),'node':run('node','--version'),'node_exec':run('node','-p','process.execPath'),'pnpm':run('pnpm','--version'),'playwright':run('pnpm','exec','playwright','--version'),'chromium':run('/usr/bin/chromium','--version'),'command':'cloud_run node scripts/verification/run.mjs','test_selection':{'MANGO_VERIFY_STAGE':'go-live','MANGO_VERIFY_FILES':['presend-checks.journeys.ts']},'runtime_options':{'CI':'true','WRANGLER_SEND_METRICS':'false','PLAYWRIGHT_SKIP_BROWSER_GC':'1','MANGO_CHROMIUM_EXECUTABLE':'/usr/bin/chromium'},'attempts_authorized':1,'retries_from_checked_in_config':0}
p.write_text(json.dumps(row,indent=2)+'\n')
PY
cloud_run node scripts/verification/run.mjs > "../packet/$label-test.log" 2>&1
result=$?
python3 - "$label" "$result" <<'PY'
import datetime,json,subprocess,sys
from pathlib import Path
p=Path('../packet')/(sys.argv[1]+'-runtime.json')
r=json.loads(p.read_text());r.update(finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),exit_code=int(sys.argv[2]),status_after=subprocess.check_output(['git','status','--porcelain'],text=True).strip());p.write_text(json.dumps(r,indent=2)+'\n')
PY
printf '%s test exit=%s\n' "$label" "$result"
tail -n 65 "../packet/$label-test.log"
exit "$result"
