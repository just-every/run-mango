from pathlib import Path
from collections import Counter
import json,subprocess
def snapshot(ref):
    return subprocess.check_output(['git','show',ref+':CONTRACT.md'],text=True)
def statuses(text):
    rows={}
    for line in text.splitlines():
        cells=line.split('|')
        if line.startswith('| `') and len(cells)>=7 and cells[4].strip() in {'done','partial','missing'}:
            rows[cells[1].strip()]=cells[4].strip()
    return rows
main=snapshot('origin/main')
before=snapshot('e5ddac0129a005f30daa5749ab5f5308196ee7f8')
candidate=Path('CONTRACT.md').read_text()
assert statuses(main)==statuses(candidate)
assert [l for l in main.splitlines() if l.startswith('| `') and not l.startswith('| `CAMP-004` |')]==[l for l in candidate.splitlines() if l.startswith('| `') and not l.startswith('| `CAMP-004` |')]
# A line diff must touch exactly the CAMP-004 row, preserving all prose and ID maps.
diff=subprocess.check_output(['git','diff','origin/main','--','CONTRACT.md'],text=True)
changed=[l[1:] for l in diff.splitlines() if l.startswith(('+','-')) and not l.startswith(('+++','---'))]
assert len(changed)==2 and all(l.startswith('| `CAMP-004` |') for l in changed)
print(json.dumps({'original_f86_counts':dict(Counter(statuses(before).values())),
                 'main_counts':dict(Counter(statuses(main).values())),
                 'candidate_counts':dict(Counter(statuses(candidate).values())),
                 'CAMP-004':{'before':statuses(before)['`CAMP-004`'],'after':statuses(candidate)['`CAMP-004`']},
                 'all_main_status_rows_retained':True,'main_non_CAMP004_rows_unchanged':True,
                 'only_contract_change':'CAMP-004 Evidence and retained f86 proof description; migration now 0105'},
                indent=2))
