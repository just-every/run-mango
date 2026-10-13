# Backup and export

Mango can export your contacts in a form that preserves their consent evidence and opt-outs, and a copy running on your computer can export and restore all of its data. It cannot yet back up and restore a hosted deployment. This page says exactly what exists, so you do not rely on something that is not there.

## What you can export today

Open **Audience** and choose **Download contacts CSV**. You get a file named `audience.csv` with one row per contact and these columns:

`email`, `phone`, `display_name`, `email_status`, `sms_status`, `consent_source`, `consent_timestamp`, `consent_method`, `consent_ip`, `confirmation_timestamp`, `confirmation_ip`, `ledger_json`, and a final marker column, `__mango_csv_encoding`.

The first eleven columns are for reading and for spreadsheets. The `ledger_json` column is the lossless part: it holds that contact's complete record, including every consent record, history entries, suppressions, and the opt-out record. Opt-outs are stored as hashes in a portable form, so your installation's secret salt is never in the file. An opt-out or suppression whose address no contact holds any more (for example after the import that created the contact was undone, or after the contact was deleted) is exported on a row of its own with no address: its `ledger_json` names the address only by that portable hash.

To keep spreadsheets from running cell contents as formulas, any value that starts with `=`, `+`, `-`, `@`, a tab, a return or an apostrophe gets a leading apostrophe, and the marker column records that. Mango removes those apostrophes when it reads its own export. Other tools will show them.

## Restoring from an export

On **Audience**, open **Import contacts**, choose your file, and select the preset **Mango audience export**. Mango reads the `ledger_json` column and restores each contact with its consent evidence and opt-outs. Rows with no address restore their opt-outs and suppressions as they are, before any contact is written, and undoing the import leaves them in place: when that address reaches Mango later, through a file, a signup or a consent capture, it is unsubscribed or suppressed, so the restored installation cannot mail it. See [Importing contacts](./importing-contacts.md) for the preview, start and undo steps.

Restoration has rules:

- A row restores only into an installation where that address does not already exist. If the address is there, the row is rejected with "Lossless Mango restoration requires an empty destination for each imported identity."
- A row without a valid `ledger_json` column is rejected.
- Opt-outs and suppressions already recorded on the receiving installation still apply, and restoring never reverses them.
- The usual import limits apply: up to 50,000 rows per review and 10 MB in total.

## What the CSV does not include

The CSV contains contacts only. It does not include:

- saved segments, campaigns, drafts, approved revisions or schedules;
- delivery results and provider facts;
- sender and signup settings, or the list of operators;
- anything else stored in your D1 database, R2 bucket or Queue.

## Export and restore a local copy

With `dev` stopped, `rer export --output exports/mango.jsonl` writes a new private archive of a local copy. It holds every record in the database and every original file with its metadata: contacts, consent, opt-outs, saved segments, campaigns and their revisions, approvals, delivery outcomes, settings, audit and import history. Operators appear only as names on that history and carry no sign-in. Sessions and sign-in links, the development outbox, secrets and provider credentials are not in it.

To restore, copy the archive and your matching `.dev.vars` into a new, empty local copy with nothing running, then run `rer import --input exports/mango.jsonl --yes`. The archive is bound to the keys in that `.dev.vars` and cannot recover them. Import refuses an archive from a different schema, a damaged archive, mismatched keys or a destination that already has data, and a refused import writes nothing. After a restore, sign in again with a fresh link. Sender evidence is tied to the installation's public address, provider credentials and keys, and every approval and send checks the provider and DNS again; a restored copy with a different address or provider key cannot send until it passes its own sender check. Opt-outs and suppressions do carry over, and provider events that arrive again after the move add no second fact. Restore runs with the ordinary app stopped: its maintenance mode refuses contact deletion, while the ordinary app refuses archive import and finalisation. Do not run separately configured app instances against the same data during a restore.

## Erasure and older archives

An archive you downloaded before deletion still contains the old personal data. Mango cannot change that file or a provider's backup. Delete or restrict those external copies under your retention policy.

The active installation records non-readable row fences and an erasure epoch. Its maintained restore API rejects an older archive when that authority is present. A fresh empty destination can also reject the old archive when supplied with the latest source journal using the authenticated HTTP restore interface. The current CLI has no journal-file option. A new installation with only an old archive and matching keys cannot discover erasures recorded after that archive was created. Do not treat restoring such a copy as preserving current erasure decisions.

Export again after deletion and retain the latest private authority with your recovery materials. Current exports omit erasure progress/receipt tables, authentication custody and temporary transfer snapshots; retained audit references contain no readable contact details. Ordinary export snapshots stay in D1 and are invalidated by erasure. Accumulated archives are cleared in bounded resumable pages; the erasure receipt remains pending until those copies and transfer metadata are removed. A previously downloaded archive or response already released to a reader cannot be recalled. Erasure removes matching stored object keys, metadata and readable literal payloads; it does not infer a person from arbitrary image pixels or encrypted binary data. These local guarantees do not certify hosted restoration or Cloudflare backup retention.

## What does not exist yet

There is no command or screen in Mango for a complete backup or restore of a hosted deployment: export and import work on a local copy, and a remote target fails. Complete deployment backup and restore is a separate release gate that is still open. A deployment can be put into restore mode, which pauses everything except sign-in, `/health` and the transfer routes: set `"MANGO_RESTORE_MODE": "1"` under `vars` in `deploy.json`, deploy, and set it back to `"0"` and deploy again afterwards. That switch is checked locally against a production build; a restore into a hosted deployment has not been run. Your data lives in the Cloudflare resources that `deploy` created in your own account, so Cloudflare's tooling for those resources is your responsibility; Mango does not verify it.

If you run Mango locally, keep your `.dev.vars` file together with a backup of the matching local database. The contact hash salt in that file is what makes saved opt-outs and suppressions still apply, and the hashes cannot be rebuilt without it.

> **Tip:** Download a contacts CSV on a schedule that suits you and keep it somewhere private. It holds personal data, consent evidence and IP addresses.
