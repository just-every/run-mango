import { safeEmailLink } from '../contact-links';
import { Field } from '@/core/app/client/ui/validation-form';
import type { DraftComposition, DraftLink } from './draft-composition';

export function CompositionLinkFields({
  links,
  setLink,
  addLink,
  removeLink,
  busy,
}: {
  addLink: () => void;
  removeLink: (index: number) => void;
  busy: boolean;
  links: DraftComposition['links'];
  setLink: (index: number, field: keyof DraftLink, value: string) => void;
}) {
  return (
    <fieldset className="composition-fieldset">
      <legend>Saved links</legend>
      {links.length ? (
        links.map((link, index) => (
          <div className="composition-link" key={index}>
            <label>
              Link {index + 1} label (required)
              <Field name={`links.${index}.label`} label={`Link ${index+1} label`} required><input value={link.label} onChange={(event) => setLink(index, 'label', event.target.value)} /></Field>
            </label>
            <label>
              Link {index + 1} destination (required)
              <Field name={`links.${index}.destinationUrl`} label={`Link ${index+1} destination`} required validate={() => safeEmailLink(link.destinationUrl) ? undefined : 'Enter a valid HTTPS, email, phone or text destination.'}><input value={link.destinationUrl} onChange={(event) => setLink(index, 'destinationUrl', event.target.value)} type="text" /></Field>
            </label>
            <button className="text-link edit-action" type="button" disabled={busy} onClick={() => removeLink(index)}>Remove link {index + 1}</button>
          </div>
        ))
      ) : (
        <p className="muted-copy">This saved revision has no links.</p>
      )}
      <button className="text-link edit-action edit-action--add" type="button" disabled={busy || links.length >= 50} onClick={addLink}>Add destination link</button>
    </fieldset>
  );
}
