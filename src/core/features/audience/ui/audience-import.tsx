import {SourceApiForm} from './source-api-form';
import type {SourceExtras} from '../../move-in/source-api';
import type {AttestationInput} from '../../move-in/incumbent-policy';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { requestJson } from '@/core/app/client/lib/api';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState } from '@/core/app/client/ui/layout';

import {IncumbentAttestations} from './incumbent-attestations';
import { AudienceArchiveImports } from './audience-archive-imports';
import { AudienceArchivePreview } from './audience-archive-preview';
import { AudienceImportJobs, abandonNotice } from './audience-import-jobs';
import { AudienceImportPreview } from './audience-import-preview';
import { resolveImportMappings } from './audience-import-mapping';
import { AudienceImportSourceForm, type SelectedImportFile } from './audience-import-source-form';
import type { ImportApiError, ImportConsent, ImportJob, ImportPreview, ImportPresetsResponse } from './audience-import-types';
import { useArchiveImport } from './use-archive-import';
import { useImportOperation, type ImportOperation } from './use-import-operation';

const emptyConsent: ImportConsent = {
  brandOrLegalSender: '',
  messageCategory: '',
  frequencyDisclosure: '',
  destinationJurisdiction: '',
  consentText: '',
  consentVersion: '',
};

const maxImportFiles = 10;
const maxImportBytes = 10_000_000;

type ImportPayload = {
  files: Array<{ name: string; csv: string; preset: string; mapping?: Record<string, string> }>;
  consent: ImportConsent;
  attestations?:AttestationInput[];
  sourceExtras?:SourceExtras;
};

function requestError(data: ImportApiError, fallback: string) {
  return data.detail?.trim() || data.error?.replaceAll('_', ' ') || fallback;
}

export function AudienceImportPage() {
  const presets = useResource<ImportPresetsResponse>('/api/audience/import-presets');
  const jobsResource = useResource<{ jobs: ImportJob[] }>('/api/audience/imports');
  const [sourceExtras,setSourceExtras]=useState<SourceExtras>();
  const [attestations,setAttestations]=useState<AttestationInput[]>([]);
  const [files, setFiles] = useState<SelectedImportFile[]>([]);
  const [mappings, setMappings] = useState<Record<string, Record<string, string>>>({});
  const [consent, setConsent] = useState<ImportConsent>(emptyConsent);
  const [preview, setPreview] = useState<ImportPreview>();
  const [previewIsCurrent, setPreviewIsCurrent] = useState(false);
  const [startedFingerprint, setStartedFingerprint] = useState<string>();
  const [busy, setBusy] = useState<'preview' | 'start'>();
  const [busyJobId, setBusyJobId] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const owner = useImportOperation();
  const archive = useArchiveImport({ setError, setNotice, owner });

  if ((presets.loading && !presets.data) || (jobsResource.loading && !jobsResource.data)) return <LoadState />;
  if (!presets.data) return <LoadState error={presets.error ?? 'Import presets could not be loaded.'} />;
  if (!jobsResource.data) return <LoadState error={jobsResource.error ?? 'Saved import activity could not be loaded.'} />;

  const canPreview = archive.archive ? !fileError : files.length > 0 && files.every((entry) => Boolean(entry.preset)) && !fileError;

  const ownsOperation = owner.owns;
  const releaseOperation = (operation: ImportOperation) => {
    if (!ownsOperation(operation)) return;
    setBusy((current) => current === 'start' ? undefined : current);
    setBusyJobId(undefined);
    owner.release(operation);
  };

  const markPreviewStale = () => {
    if (preview) setPreviewIsCurrent(false);
    archive.stale();
    setError(undefined);
    setNotice(undefined);
  };

  const addFiles = (selected: File[]) => {
    if (!selected.length) return;
    setSourceExtras(undefined);setAttestations([]);
    setFileError(undefined);
    const zips = selected.filter((file) => file.name.toLowerCase().endsWith('.zip'));
    if (zips.length) {
      if (zips.length > 1 || selected.length > 1 || files.length) { setFileError('Choose one account export (.zip) on its own, or CSV files without an archive.'); return; }
      archive.choose(zips[0]);
      setError(undefined);
      setNotice(undefined);
      return;
    }
    const invalid = selected.find((file) => !file.name.toLowerCase().endsWith('.csv'));
    if (invalid) {
      setFileError(`${invalid.name} is not a CSV file. Choose files with a .csv extension.`);
      return;
    }
    const duplicate = selected.find((file) => files.some((entry) => entry.name === file.name)
      || selected.filter((candidate) => candidate.name === file.name).length > 1);
    if (duplicate) {
      setFileError(`A file named ${duplicate.name} is already selected. Rename one file so each source can be mapped and reviewed separately.`);
      return;
    }
    if (files.length + selected.length > maxImportFiles) {
      setFileError(`Choose no more than ${maxImportFiles} CSV files in one import.`);
      return;
    }
    const totalBytes = [...files.map((entry) => entry.file.size), ...selected.map((file) => file.size)].reduce((sum, size) => sum + size, 0);
    if (totalBytes > maxImportBytes) {
      setFileError('The selected CSV files exceed the 10 MB import limit. Remove a file or choose smaller exports.');
      return;
    }
    setFiles((current) => [...current, ...selected.map((file) => ({ name: file.name, file, preset: '' }))]);
    markPreviewStale();
  };

  const removeFile = (fileName: string) => {
    setFiles((current) => current.filter((entry) => entry.name !== fileName));
    setPreview((current) => current ? {...current, columns: current.columns.filter((column) => column.name !== fileName)} : current);
    setMappings((current) => {
      const next = { ...current };
      delete next[fileName];
      return next;
    });
    markPreviewStale();
  };

  const changePreset = (fileName: string, preset: string) => {
    setFiles((current) => current.map((entry) => entry.name === fileName ? { ...entry, preset } : entry));
    markPreviewStale();
  };

  const changeMapping = (fileName: string, field: string, header: string) => {
    setMappings((current) => ({
      ...current,
      [fileName]: { ...current[fileName], [field]: header },
    }));
    markPreviewStale();
  };

  const changeConsent = (field: keyof ImportConsent, value: string) => {
    setConsent((current) => ({ ...current, [field]: value }));
    markPreviewStale();
  };

  const readPayload = async (): Promise<ImportPayload> => {
    const requestFiles = await Promise.all(files.map(async ({ file, name, preset }) => {
      const csv = await file.text();
      const mapping = mappings[name] ?? {};
      return {
        name,
        csv,
        preset,
        ...(Object.keys(mapping).length ? { mapping } : {}),
      };
    }));
    return { files: requestFiles, consent,...(attestations.length?{attestations}:{}),...(sourceExtras?{sourceExtras}:{}) };
  };

  const review = async () => {
    if (archive.archive) { await archive.review(consent); return; }
    if (!canPreview || busy) return;
    setBusy('preview');
    setError(undefined);
    setNotice(undefined);
    try {
      const payload = await readPayload();
      const response = await requestJson<ImportPreview & ImportApiError>('/api/audience/import-preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (response.status >= 300 || !response.data.fingerprint) {
        setPreviewIsCurrent(false);
        setError(requestError(response.data, 'The CSV could not be reviewed. Correct the source or mapping and try again.'));
        return;
      }
      setPreview(response.data);
      setMappings(resolveImportMappings(response.data.columns));
      setPreviewIsCurrent(true);
      setStartedFingerprint(undefined);
      setNotice('Preview ready. No contacts have been imported yet.');
    } catch (cause) {
      setPreviewIsCurrent(false);
      setError(cause instanceof Error ? `A selected CSV could not be read: ${cause.message}` : 'A selected CSV could not be read. Choose the file again and retry.');
    } finally {
      setBusy(undefined);
    }
  };

  const startImport = async () => {
    if (!preview || !previewIsCurrent || startedFingerprint === preview.fingerprint || busy || busyJobId || archive.busy || archive.busyId) return;
    const operation = owner.acquire('csv');
    if (!operation) return;
    setBusy('start');
    setError(undefined);
    setNotice(undefined);
    try {
      const response = await requestJson<{ job?: ImportJob } & ImportApiError>('/api/audience/imports', {
        method: 'POST',
        body: JSON.stringify({ fingerprint: preview.fingerprint }),
      });
      if (!ownsOperation(operation)) return;
      if (response.status >= 300 || !response.data.job) {
        if (response.status === 409) setPreviewIsCurrent(false);
        setError(requestError(response.data, 'The import could not be started. Review the CSV again before retrying.'));
        return;
      }
      const { job } = response.data;
      setStartedFingerprint(preview.fingerprint);
      setNotice(`Import ${job.state.replaceAll('_', ' ')}: ${job.checkpoint} of ${job.total} rows processed.`);
      await jobsResource.reload();
      if (writing(job)) await driveJob(job.id, 'resume', operation);
    } catch {
      if (ownsOperation(operation)) setError('The start result could not be confirmed. Refresh imports before trying again.');
    } finally {
      releaseOperation(operation);
    }
  };

  const writing = (job: ImportJob) => ['queued', 'applying'].includes(job.state) && !job.abandonedAt;

  const runJobAction = async (id: string, action: 'resume' | 'undo' | 'abandon') => {
    const operation = owner.acquire('csv');
    if (!operation) return;
    try {
      await driveJob(id, action, operation);
    } finally {
      releaseOperation(operation);
    }
  };

  const driveJob = async (id: string, action: 'resume' | 'undo' | 'abandon', operation: ImportOperation) => {
    if (!ownsOperation(operation)) return;
    // Start hands its existing owner to the driver without opening the lock between requests.
    setBusyJobId(id);
    setBusy((current) => current === 'start' ? undefined : current);
    setError(undefined);
    setNotice(undefined);
    try {
      for (;;) {
        if (!ownsOperation(operation) || operation.stopped) return;
        const response = await requestJson<{ job?: ImportJob } & ImportApiError>(`/api/audience/imports/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
        if (!ownsOperation(operation)) return;
        if (response.status >= 300 || !response.data.job) {
          setError(requestError(response.data, `The import could not be ${{ resume: 'resumed', undo: 'undone', abandon: 'abandoned' }[action]}. Review the import status before trying again.`));
          await jobsResource.reload();
          return;
        }
        const { job } = response.data;
        setNotice(action === 'undo'
          ? `Import ${job.state.replaceAll('_', ' ')}. Later opt-outs and suppressions remain protected.`
          : action === 'abandon' || job.abandonedAt
            ? abandonNotice(job)
            : `Import ${job.state.replaceAll('_', ' ')}: ${job.checkpoint} of ${job.total} rows processed.`);
        await jobsResource.reload();
        if (action !== 'resume' || !writing(job)) return;
      }
    } catch {
      if (ownsOperation(operation)) setError(`The ${action} result could not be confirmed. Refresh imports before trying again.`);
    }
  };

  return (
    <div className="page-flow audience-import-page">
      <header className="page-head audience-import-intro">
        <div className="page-head__text">
          <Link className="back-link" to="/app/audience">← Back to audience</Link>
          <p className="eyebrow">Audience</p>
          <h1>Import contacts</h1>
          <p className="page-head__lead">Suppression and opt-out records are applied first and can never be reversed by an import. CSV consent fields must describe the original disclosure and cannot create consent. Any row missing its original scope, opt-in time, or confirmation time stays non-subscribed.</p>
        </div>
      </header>

      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      {notice ? <p className="action-notice" role="status">{notice}</p> : null}

      <SourceApiForm disabled={owner.busy||Boolean(busy)||Boolean(archive.busy)} onExport={value=>{archive.choose(undefined);setFiles(value.files.map(file=>({name:file.name,preset:file.preset,file:new File([file.csv],file.name,{type:'text/csv'})})));setSourceExtras(value.sourceExtras);setAttestations([]);setMappings({});setPreview(undefined);setPreviewIsCurrent(false);setNotice('Source export read. Review the original scope and make the source attestation before applying it.');}}/>
      {sourceExtras?<section className="panel audience-import-panel"><h2>Source outlines and review notes</h2><ul>{sourceExtras.notes.map((note,index)=><li key={index}>{note}</li>)}{sourceExtras.segments.map((segment,index)=><li key={'segment-'+index}>{segment.name}: {segment.conditions}</li>)}</ul><p>{sourceExtras.templates.length} templates and {sourceExtras.history.length} recorded history events wait for the reviewed import.</p></section>:null}
      <AudienceImportSourceForm
        files={files}
        archive={archive.archive}
        presets={presets.data.presets}
        fields={presets.data.fields}
        messageCategories={presets.data.messageCategories}
        consent={consent}
        columns={preview?.columns}
        mappings={mappings}
        canPreview={canPreview}
        busy={Boolean(busy || archive.busy || owner.busy)}
        previewIsCurrent={archive.archive ? archive.current : previewIsCurrent}
        fileError={fileError}
        onFilesSelected={addFiles}
        onRemoveFile={removeFile}
        onRemoveArchive={() => { archive.choose(undefined); setFileError(undefined); }}
        onPresetChange={changePreset}
        onMappingChange={changeMapping}
        onConsentChange={changeConsent}
        onPreview={() => void review()}
      />

      {archive.archive&&archive.preview?.summary.attestationSources?.length?<IncumbentAttestations sources={archive.preview.summary.attestationSources} scope={consent} values={archive.attestations} onChange={archive.changeAttestation} disabled={owner.busy}/>:null}
      {archive.archive && archive.preview ? <AudienceArchivePreview preview={archive.preview} isCurrent={archive.current} /> : null}
      {archive.archive && archive.preview ? (
        <section className="audience-import-final-action notice-note" aria-label="Import reviewed archive">
          <div>
            <p className="eyebrow">Review complete</p>
            <p>{archive.current ? 'Importing brings in contacts by status, imported history and library templates. It grants no schedule, approval or send.' : 'This preview is out of date. Preview the archive again before importing it.'}</p>
            {busyJobId ? <p role="status">An import is still running. Wait for it to finish or press Stop in Imports below before starting another.</p> : archive.busyId ? <p role="status">An archive import is still running. Wait for it to finish before starting another.</p> : null}
          </div>
          <button className="primary-action" type="button" onClick={() => { if (!busy && !busyJobId) void archive.start(consent); }} disabled={!archive.current || Boolean(busy) || owner.busy || Boolean(busyJobId) || Boolean(archive.busy) || Boolean(archive.busyId)}>
            {archive.busy === 'start' || archive.busyId ? 'Importing…' : 'Import archive'}
          </button>
        </section>
      ) : null}
      {!archive.archive&&preview?.attestationSources?.length?<IncumbentAttestations title="Source-held consent" sources={preview.attestationSources} scope={consent} values={attestations} onChange={value=>{setAttestations(rows=>[...rows.filter(r=>r.sourceKey!==value.sourceKey),value]);markPreviewStale();}} disabled={owner.busy}/>:null}
      {!archive.archive && preview ? <AudienceImportPreview preview={preview} isCurrent={previewIsCurrent} /> : null}
      {!archive.archive && preview ? (
        <section className="audience-import-final-action notice-note" aria-label="Start reviewed import">
          <div>
            <p className="eyebrow">Review complete</p>
            <p>{!previewIsCurrent ? 'This preview is out of date. Refresh it before starting the import.' : startedFingerprint === preview.fingerprint ? 'Import started. Check the Imports list below for saved progress and actions.' : 'This is the reviewed preview. Check the Imports list below for saved progress.'}</p>
            {busyJobId ? <p role="status">An import is still running. Wait for it to finish or press Stop in Imports below before starting another.</p> : archive.busyId ? <p role="status">An archive import is still running. Wait for it to finish before starting another.</p> : null}
          </div>
          <button className="primary-action" type="button" onClick={() => void startImport()} disabled={!previewIsCurrent || startedFingerprint === preview.fingerprint || !preview.rows.length || Boolean(busy) || owner.busy || Boolean(busyJobId) || Boolean(archive.busy) || Boolean(archive.busyId)}>
            {busy === 'start' ? 'Starting…' : startedFingerprint === preview.fingerprint ? 'Import started' : 'Start import'}
          </button>
        </section>
      ) : null}

      {archive.archives.data ? <AudienceArchiveImports archives={archive.archives.data.archives} busyId={archive.busyId} actionsBusy={owner.busy}
        onUndo={(id) => void archive.undo(id)} onContinue={(id) => void archive.resume(id)} /> : null}

      <AudienceImportJobs
        jobs={jobsResource.data.jobs}
        loading={jobsResource.loading}
        error={jobsResource.error}
        busyJobId={busyJobId}
        actionsBusy={owner.busy}
        onRefresh={() => void jobsResource.reload()}
        onResume={(id) => void runJobAction(id, 'resume')}
        onUndo={(id) => void runJobAction(id, 'undo')}
        onAbandon={(id) => void runJobAction(id, 'abandon')}
        onStop={() => owner.stopCsv(owner.operation)}
      />
    </div>
  );
}
