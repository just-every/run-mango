"""Mechanical applied-migration preservation and synthetic upgrade proof."""
import hashlib,json,re,sqlite3,subprocess
from pathlib import Path
def git(*args):
    return subprocess.check_output(['git',*args])
root=Path.cwd()
main_ref=git('rev-parse','origin/main').decode().strip()
main_names=git('ls-tree','-r','--name-only','origin/main','--','migrations/core/').decode().splitlines()
main={name:git('show',f'origin/main:{name}') for name in main_names if name.endswith('.sql')}
current={str(p):p.read_bytes() for p in Path('migrations/core').glob('*.sql')}
assert all(current.get(name)==data for name,data in main.items()),'applied main migration changed'
added=sorted(set(current)-set(main))
assert added==['migrations/core/0105_native_audience_authority.sql'],added
maxmain=max(int(Path(name).name.split('_')[0]) for name in main)
assert int(Path(added[0]).name.split('_')[0])==maxmain+1
old=git('show','e5ddac0129a005f30daa5749ab5f5308196ee7f8:migrations/core/0104_native_audience_authority.sql')
assert current[added[0]]==old,'renumber changed SQL'
spec=json.loads(Path('management/integration/deployment-spec.json').read_text())
inventory={row['name']:row for row in spec['migrations']}
for name,data in current.items():
    row=inventory['core-'+Path(name).name]
    assert row['sha256']==hashlib.sha256(data).hexdigest()
    assert row['sql'].encode()==data
result={'main_head':main_ref,'main_migrations':len(main),'candidate_migrations':len(current),
        'preserved_main_files':len(main),'added':added,'old_prefix':104,'new_prefix':105,
        'legacy_duplicate_prefixes':{},'paths':[]}
for name in main:
    prefix=Path(name).name.split('_')[0]
    result['legacy_duplicate_prefixes'].setdefault(prefix,[]).append(name)
result['legacy_duplicate_prefixes']={p:n for p,n in result['legacy_duplicate_prefixes'].items() if len(n)>1}
for door in ['empty','main-state']:
    db=sqlite3.connect(':memory:')
    db.execute('PRAGMA foreign_keys=ON')
    db.execute('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TEXT DEFAULT CURRENT_TIMESTAMP)')
    def apply(files):
        for name in sorted(files):
            db.executescript(current[name].decode())
            db.execute('INSERT INTO d1_migrations(name) VALUES(?)',(Path(name).name,))
    if door=='empty':
        apply(current)
    else:
        apply(main)
        db.execute("INSERT INTO contacts(id,display_name,email_status,sms_status,created_at,updated_at) VALUES('synthetic-retained-contact','Synthetic migration proof','subscribed','not-subscribed',1,1)")
        baseline=db.execute("SELECT * FROM contacts WHERE id='synthetic-retained-contact'").fetchone()
        apply({name:current[name] for name in added})
        assert db.execute("SELECT * FROM contacts WHERE id='synthetic-retained-contact'").fetchone()==baseline
    before=db.execute('SELECT generation FROM audience_source_authority WHERE id=1').fetchone()[0]
    db.execute("INSERT INTO contacts(id,display_name,email_status,sms_status,created_at,updated_at) VALUES('synthetic-new-contact','Synthetic generation proof','subscribed','not-subscribed',1,1)")
    inserted=db.execute('SELECT generation FROM audience_source_authority WHERE id=1').fetchone()[0]
    db.execute("UPDATE contacts SET display_name='Synthetic updated' WHERE id='synthetic-new-contact'")
    updated=db.execute('SELECT generation FROM audience_source_authority WHERE id=1').fetchone()[0]
    db.execute("DELETE FROM contacts WHERE id='synthetic-new-contact'")
    deleted=db.execute('SELECT generation FROM audience_source_authority WHERE id=1').fetchone()[0]
    assert [inserted-before,updated-inserted,deleted-updated]==[1,1,1]
    expected_triggers=re.findall(r'CREATE TRIGGER (\w+)',current[added[0]].decode())
    triggers=sum(bool(db.execute("SELECT 1 FROM sqlite_master WHERE type='trigger' AND name=?",(name,)).fetchone()) for name in expected_triggers)
    assert triggers==18,triggers
    count=db.execute('SELECT count(*) FROM d1_migrations').fetchone()[0]
    assert count==len(current)
    result['paths'].append({'door':door,'applied_migrations':count,'native_audience_triggers':triggers,'contact_insert_update_delete_deltas':[1,1,1],'retained_main_contact':door=='main-state'})
    db.close()
print(json.dumps(result,indent=2))
