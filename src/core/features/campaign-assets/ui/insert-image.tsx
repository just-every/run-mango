import { useRef, useState } from 'react';
import { Modal } from '@/core/app/client/ui/modal';
import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { escapeHtml } from '@/core/features/campaigns/email-html-policy';
import { emailColumnPixels } from '@/core/features/campaigns/email-limits';
import { campaignAssetLimits } from '../limits';
import { CampaignImageUploadError, uploadCampaignImage, type UploadedAsset } from './upload';

/** The `<img>` for an uploaded campaign image, sized from the server's reading of its header. */
export function imageTag(asset: UploadedAsset, alt: string) {
  const width = Math.max(2, Math.min(asset.width, emailColumnPixels));
  const height = Math.max(2, Math.round(asset.height * width / asset.width));
  return `<img src="${escapeHtml(asset.url)}" width="${width}" height="${height}" alt="${escapeHtml(alt)}">`;
}

/** "Insert image" in the HTML-mode email editor (CAMP-012): the operator's file is uploaded through the
 * campaign image door and its own-origin /media address is written into the body at the cursor. */
export function InsertImage({ disabled, onInsert }: { disabled: boolean; onInsert: (html: string) => void }) {
  const [open, setOpen] = useState(false);
  const [alt, setAlt] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string>();
  const file = useRef<HTMLInputElement>(null);
  const close = () => { if (working) return; setOpen(false); setError(undefined); setAlt(''); };
  const submit = async () => {
    const chosen = file.current?.files?.[0];
    if (!chosen) return;
    setWorking(true); setError(undefined);
    try {
      onInsert(imageTag(await uploadCampaignImage(chosen, chosen.name), alt.trim()));
      setOpen(false); setAlt('');
    } catch (problem) {
      setError(`${problem instanceof CampaignImageUploadError ? problem.message : 'The image could not be uploaded.'} The email body was not changed.`);
    } finally { setWorking(false); }
  };
  return <>
    <button type="button" className="secondary-action" disabled={disabled} onClick={() => setOpen(true)}>Insert image</button>
    {open ? <Modal open role="dialog" onClose={close} title="Insert an image"
      description="Mango stores the image once and serves it from this deployment's own address. Every recipient gets the same address, so opening an email is never recorded.">
      <ValidationForm className="design-import-form" aria-label="Insert an image" aria-busy={working} onValidSubmit={() => void submit()}>
        <fieldset className="design-import-form__fields" disabled={working}>
          <label>Image file (PNG, JPEG, GIF or WebP)<Field name="image" label="Image file" required><input ref={file} type="file" accept={campaignAssetLimits.contentTypes.join(',')} /></Field></label>
          <label>Image description<Field name="alt" label="Image description" required validate={() => alt.includes('{{') ? 'Personalisation cannot be used in an image description.' : undefined}><input value={alt} onChange={event => setAlt(event.target.value)} /></Field></label>
          <p className="muted-copy">Shown when images are off and read aloud by screen readers.</p>
        </fieldset>
        {error ? <p className="inline-error" role="alert">{error}</p> : null}
        {working ? <p className="muted-copy" role="status">Uploading the image</p> : null}
        <div className="detail-actions">
          <button type="button" className="secondary-action" onClick={close} disabled={working}>Cancel</button>
          <button type="submit" className="primary-action" disabled={working}>{working ? 'Uploading…' : 'Upload and insert'}</button>
        </div>
      </ValidationForm>
    </Modal> : null}
  </>;
}
