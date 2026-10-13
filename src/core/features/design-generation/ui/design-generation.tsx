import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { authoredBody, htmlToText } from '@/core/features/campaigns/authoring-content';
import type { DraftComposition } from '@/core/features/campaigns/ui/draft-composition';
import { draftBrief } from '@/core/features/design-import/brief';
import { importState } from '@/core/features/design-import/ui/import-state';
import type { ImportSummary } from '@/core/features/design-import/ui/import-summary';
import { briefWithoutTokens, designsOnOffer, type DesignJobView } from '../model';
import { awaitingDesign, useOperatorActivity } from './awaiting-design';
import { BriefDialog } from './brief-dialog';
import { DesignRun } from './design-run';
import { EarlierRuns } from './earlier-runs';
import { clockTime } from './relative-time';
import { useDesignStatus } from './use-design-status';

// Building the email (LayerDoc reader, planner, compiler and image cropping) loads only when the operator uses a design.
const ApplyDialog = lazy(() => import('./apply-dialog').then(module => ({ default: module.ApplyDialog })));

/** The brief Mango offers: the draft's name, subject, preheader, sender and current text, without tokens. */
export const generationBrief = (draft: DraftComposition) => briefWithoutTokens([draftBrief(draft), htmlToText(authoredBody(draft.emailBody))].filter(Boolean).join('\n'));

/** A prepared design, named by its run and chosen candidate. */
const designKey = (job: DesignJobView) => `${job.id}:${job.chosenSlot ?? ''}`;
type Placed = { key: string; body: string; savedBefore: string };
type Dialog = { kind: 'brief' } | { kind: 'apply'; jobId: string };

/** Design with 12ui in the draft's email editor (DESIGN-001 to DESIGN-003). Shown only when this deployment's design
 * module is configured. It starts a background run on the owner's 12ui account; "Use this design" prepares the chosen
 * candidate's layout, and once it is ready the run shows a notice whose action opens the design import path, which
 * hands the email to the editor as an unsaved edit. The import path opens by itself only as the direct continuation of
 * "Use this design", when the operator has pressed no key, pointer or wheel since (awaiting-design.ts); otherwise the
 * notice waits, and nothing takes focus from an operator who is working. A run stays open until the draft is saved
 * with its design or the operator discards it, so Discard changes, a reload, a failed layout step or a newer run loses
 * nothing paid for. It never saves, approves, schedules or sends. `body` and `saved` are the editor's and the saved
 * authored body. */
export function DesignGeneration({ campaignId, draft, body, saved, replacing, mediaOrigin, busy, onImported }: {
  campaignId: string; draft: DraftComposition; body: string; saved: string; replacing: boolean; mediaOrigin: string; busy: boolean;
  onImported: (html: string, summary: ImportSummary) => void;
}) {
  const { enabled, runs, working, error: readError, reload, setJob } = useDesignStatus(campaignId);
  const [dialog, setDialog] = useState<Dialog>();
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<{ jobId: string; message: string }>();
  const [placed, setPlaced] = useState<Placed>();
  const recording = useRef(false);
  useOperatorActivity();
  const [latest, ...earlier] = runs;
  const placedRun = placed ? runs.find(run => run.state === 'ready' && designKey(run) === placed.key) : undefined;
  const applying = dialog?.kind === 'apply' ? runs.find(run => run.id === dialog.jobId && run.state === 'ready' && run.layerDocUrl) : undefined;

  const act = async (target: DesignJobView, path: string, payload: unknown, refused: string) => {
    setActing(true); setError(undefined);
    try {
      const response = await requestJson<{ job?: DesignJobView }>(`/api/design-jobs/${encodeURIComponent(target.id)}/${path}`, { method: 'POST', body: JSON.stringify(payload) });
      if (response.data.job) setJob(response.data.job);
      if (response.status >= 400) { setError({ jobId: target.id, message: refused }); await reload(); return false; }
      return true;
    } catch { setError({ jobId: target.id, message: 'Mango could not be reached. Nothing was changed.' }); return false; }
    finally { setActing(false); }
  };

  // The layout the operator asked for and is still waiting on opens the import path; any activity since leaves the notice.
  const awaited = runs.find(run => run.state === 'ready' && run.layerDocUrl && awaitingDesign.get() === designKey(run));
  useEffect(() => {
    if (!awaited || dialog) return;
    awaitingDesign.clear();
    setDialog({ kind: 'apply', jobId: awaited.id });
  }, [awaited?.id, awaited?.layerDocUrl, dialog]);

  // The run is used once the draft is saved with its design; Discard changes leaves the design on offer.
  useEffect(() => {
    if (!placed || !placedRun || recording.current) return;
    const state = importState(placed, body, saved);
    if (state === 'discarded') { setPlaced(undefined); return; }
    if (state !== 'saved' && state !== 'edited-saved') return;
    recording.current = true;
    void act(placedRun, 'close', { outcome: 'applied' }, 'The draft is saved with the design, but Mango could not record that it was used.')
      .then(() => { recording.current = false; setPlaced(undefined); });
  }, [placed, placedRun, body, saved]);

  if (!enabled) return readError ? <p className="inline-error" role="alert">{readError}</p> : null;

  const use = (job: DesignJobView, slot: string) => {
    if (job.state === 'ready' && job.chosenSlot === slot) { setDialog({ kind: 'apply', jobId: job.id }); return; }
    awaitingDesign.set(`${job.id}:${slot}`);
    void act(job, 'choose', { slot }, 'Mango could not start preparing that design. The run is shown as it now stands.')
      .then(started => { if (!started) awaitingDesign.clear(); });
  };
  const runPanel = (job: DesignJobView, title: string) => <DesignRun key={job.id} job={job} title={title} busy={busy || acting || dialog?.kind === 'apply'}
    placed={placed?.key === designKey(job) && job.state === 'ready'} error={error?.jobId === job.id ? error.message : undefined}
    onUse={slot => use(job, slot)} onApply={() => setDialog({ kind: 'apply', jobId: job.id })}
    onDiscard={() => void act(job, 'close', { outcome: 'discarded' }, 'Mango could not close this run. The run is shown as it now stands.')} />;
  const kept = runs.reduce((count, run) => count + designsOnOffer(run).length, 0);

  return <>
    <button type="button" className="secondary-action" disabled={busy || working} title={working ? 'A design for this draft is still being made.' : undefined}
      onClick={() => setDialog({ kind: 'brief' })}>Design with 12ui</button>
    {latest ? runPanel(latest, 'Design with 12ui') : null}
    {earlier.length ? <EarlierRuns runs={earlier}>{earlier.map(run => runPanel(run, `Designs from ${clockTime(run.createdAt)}`))}</EarlierRuns> : null}
    {dialog?.kind === 'brief' ? <BriefDialog campaignId={campaignId} kept={kept} initialBrief={latest?.state === 'failed' ? latest.brief : generationBrief(draft)}
      onClose={() => setDialog(undefined)} onStarted={started => { setJob(started); setDialog(undefined); void reload(); }} /> : null}
    {applying ? <Suspense fallback={<p className="muted-copy" role="status">Opening the design…</p>}>
      <ApplyDialog job={applying} replacing={replacing} mediaOrigin={mediaOrigin} onClose={() => setDialog(undefined)}
        onApplied={(html, summary) => { setDialog(undefined); setPlaced({ key: designKey(applying), body: authoredBody(html), savedBefore: saved }); onImported(html, summary); }} />
    </Suspense> : null}
  </>;
}
