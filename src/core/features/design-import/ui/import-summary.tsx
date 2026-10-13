import type { DroppedLayer } from '../plan';
import type { UploadedImage } from './host-images';
import type { ImportState } from './import-state';

/** `altNotInBrief`: the design wrote this description, and it becomes the image's alt text in the email. */
export type ImportSummary = { unreviewed: string[]; images: (UploadedImage & { altNotInBrief: boolean })[]; button?: { label: string; href: string }; dropped: DroppedLayer[]; adjustments: string[] };

const kilobytes = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

const status: Record<Exclude<ImportState, 'discarded'>, string> = {
  unsaved: 'not saved yet', saved: 'saved', edited: 'edited since import, not saved yet', 'edited-saved': 'edited since import and saved',
};

/** What an import changed, shown beside the editor until dismissed or discarded (DESIGN-004). Highlights
 * live only here; they never enter the email body. */
export function ImportSummaryPanel({ summary, state, onDismiss }: { summary: ImportSummary; state: Exclude<ImportState, 'discarded'>; onDismiss: () => void }) {
  const total = summary.images.reduce((sum, image) => sum + image.bytes, 0);
  const saved = state === 'saved' || state === 'edited-saved', edited = state === 'edited' || state === 'edited-saved';
  return <section className="design-import-summary" aria-labelledby="design-import-summary-title">
    <div className="design-import-summary__head">
      <div>
        <p className="eyebrow">Imported design · {status[state]}</p>
        <h3 id="design-import-summary-title">{saved ? 'Check the imported email before you approve' : 'Check the imported email before you save'}</h3>
        {edited ? <p className="muted-copy">This summary describes the design as it was imported, before your edits.</p> : null}
      </div>
      <button type="button" className="text-link" onClick={onDismiss}>Dismiss</button>
    </div>
    <div className="design-import-summary__group">
      <h4>Not in your brief ({summary.unreviewed.length})</h4>
      {summary.unreviewed.length
        ? <><p className="muted-copy">The design wrote these lines. Check every claim, name and date before approving.</p>
          <ul className="design-import-lines">{summary.unreviewed.map(line => <li key={line}><mark>{line}</mark></li>)}</ul></>
        : <p className="muted-copy">Every line of the design appears in your brief.</p>}
    </div>
    <div className="design-import-summary__group">
      <h4>Images added ({summary.images.length}, {kilobytes(total)})</h4>
      {summary.images.length ? <>
        <p className="muted-copy">These are the hosted images recipients will see. Check that each one matches the design and its description, and that none carries words of its own.</p>
        <ul className="design-import-images">{summary.images.map(image => <li key={image.url}>
          {/* Same-origin path: the operator sees the exact hosted bytes, whatever public address the email uses. */}
          <img src={new URL(image.url).pathname} alt="" width={image.width} height={image.height} loading="lazy" />
          <span>{image.altNotInBrief ? <mark>{image.alt}</mark> : image.alt || 'Image'} <span className="muted-copy">{image.width}×{image.height} px, {kilobytes(image.bytes)}</span></span>
        </li>)}</ul>
      </> : <p className="muted-copy">The design has no images.</p>}
    </div>
    {summary.button ? <div className="design-import-summary__group">
      <h4>Button</h4>
      <p>“{summary.button.label}” links to <span className="design-import-url">{summary.button.href}</span></p>
    </div> : null}
    <div className="design-import-summary__group">
      <h4>Left out ({summary.dropped.length})</h4>
      {summary.dropped.length ? <ul>{summary.dropped.map((layer, index) => <li key={`${index}-${layer.text}`}>{layer.text} <span className="muted-copy">{layer.kind}, {layer.reason}</span></li>)}</ul> : <p className="muted-copy">Nothing was left out.</p>}
    </div>
    {summary.adjustments.length ? <div className="design-import-summary__group">
      <h4>Adjusted for email</h4>
      <ul>{summary.adjustments.map(note => <li key={note}>{note}</li>)}</ul>
    </div> : null}
    <p className="muted-copy">Unsubscribe and your saved postal address replace the design&apos;s footer links and address. {saved ? 'Check the preview and approval checks of the saved draft.' : 'Save the draft, then check the preview and approval checks.'}</p>
  </section>;
}
