import { lazy, Suspense, useEffect, useState } from 'react';
import { authoredBody, htmlToText } from '@/core/features/campaigns/authoring-content';
import { requiresHtmlEditing } from '@/core/features/campaigns/email-presentation';
import type { DraftComposition } from '@/core/features/campaigns/ui/draft-composition';
import { draftBrief } from '../brief';
import { importState, type ImportedDesign } from './import-state';
import { ImportSummaryPanel, type ImportSummary } from './import-summary';
import { DesignGeneration } from '@/core/features/design-generation/ui/design-generation';

// The importer (LayerDoc reader, planner, compiler and image cropping) loads only when an operator opens it.
const ImportDialog = lazy(() => import('./import-dialog').then(module => ({ default: module.ImportDialog })));

/** "Import 12ui design" in the draft email editor (DESIGN-004): a LayerDoc and its candidate PNG, made with
 * the owner's own 12ui CLI, become the email body as an unsaved edit. "Design with 12ui" (DESIGN-002) reaches the
 * same result from a brief when the design module is configured. Saving, previewing and approval are the ordinary
 * draft steps; neither ever saves, approves, schedules or sends. */
export function DesignImport({ campaignId, draft, savedEmailBody, mediaOrigin, busy, onImport }: {
  campaignId: string; draft: DraftComposition; savedEmailBody: string; mediaOrigin: string; busy: boolean; onImport: (html: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [imported, setImported] = useState<ImportedDesign>();
  const body = authoredBody(draft.emailBody), saved = authoredBody(savedEmailBody);
  const replacing = Boolean(htmlToText(body).trim()) || requiresHtmlEditing(body);
  const state = imported ? importState(imported, body, saved) : undefined;
  // Discard changes brought the earlier body back: the summary no longer describes anything in the editor.
  useEffect(() => { if (state === 'discarded') setImported(undefined); }, [state]);
  const received = (html: string, summary: ImportSummary) => { onImport(html); setImported({ summary, body: authoredBody(html), savedBefore: saved }); };
  return <div className="design-import">
    <div className="design-import__row">
      <DesignGeneration campaignId={campaignId} draft={draft} body={body} saved={saved} replacing={replacing} mediaOrigin={mediaOrigin} busy={busy} onImported={received} />
      <button type="button" className="secondary-action" disabled={busy} onClick={() => setOpen(true)}>Import 12ui design</button>
      <p className="muted-copy">From <code>12ui draft</code> and <code>12ui convert … --output layerdoc</code>.</p>
    </div>
    {open ? <Suspense fallback={<p className="muted-copy" role="status">Opening the importer…</p>}>
      <ImportDialog open initialBrief={draftBrief(draft)} replacing={replacing} mediaOrigin={mediaOrigin} onClose={() => setOpen(false)}
        onImported={received} />
    </Suspense> : null}
    {imported && state && state !== 'discarded' ? <ImportSummaryPanel summary={imported.summary} state={state} onDismiss={() => setImported(undefined)} /> : null}
  </div>;
}
