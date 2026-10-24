import { SegmentPicker } from './segment-picker';
import { ValidationForm } from '@/core/app/client/ui/validation-form';
import type { FieldErrors } from '@/core/app/client/ui/field-errors';
import { authoredLinks } from '../authoring-content';
import { authoredEditorHtml, authoredHtmlTemplate } from './editor-html';
import { AudienceRuleEditor } from './audience-rule-editor';
import type { DraftComposition, DraftLink, DraftScalarField, DraftStep } from './draft-composition';

import { CompositionContentFields } from './composition-content-fields';
import { CompositionLinkFields } from './composition-link-fields';
import { CompositionStepFields } from './composition-step-fields';

export function CampaignCompositionEditor({
  campaignId,
  draft,
  savedEmailBody,
  mediaOrigin,
  busy,
  onChange,
  onSave,
  storeTimezone,
  serverErrors,
  validationRequest,
}: {
  campaignId: string;
  draft: DraftComposition;
  /** The saved revision's body, so the design import summary can say whether the import is saved. */
  savedEmailBody: string;
  /** The deployment's own origin, where its campaign images are served (CAMP-012). */
  mediaOrigin: string;
  busy: boolean;
  onChange: (draft: DraftComposition) => void;
  onSave: () => void;
  storeTimezone: string;
  serverErrors?: FieldErrors;
  validationRequest?: number;
}) {
  const setField = (field: DraftScalarField, value: string, imported = false) => {
    if(field!=='emailBody') {onChange({...draft,[field]:value});return;}
    const previous=new Set(authoredLinks(draft.emailBody).map(link=>link.destinationUrl));
    const current=authoredLinks(value),destinations=new Set(current.map(link=>link.destinationUrl));
    const pending=draft.links.filter(link=>!previous.has(link.destinationUrl)&&!destinations.has(link.destinationUrl));
    onChange({...draft,...(imported?{designTemplateKey:crypto.randomUUID()}:{}),emailBody:value,links:[...current,...pending]});
  };
  const setLink = (index: number, field: keyof DraftLink, value: string) => {
    const links = draft.links.map((link, itemIndex) =>
      itemIndex === index ? { ...link, [field]: value } : link,
    );
    const template=authoredHtmlTemplate(draft.emailBody);
    for (const anchor of template.content.querySelectorAll('a')) if (anchor.getAttribute('href')===draft.links[index].destinationUrl) {
      if (field==='destinationUrl') anchor.setAttribute('href',value); else anchor.textContent=value;
    }
    onChange({ ...draft, emailBody:authoredEditorHtml(template), links });
  };


  return (
    <ValidationForm
      id="campaign-composer"
      serverErrors={serverErrors}
      validationRequest={validationRequest}
      aria-busy={busy}
      className="panel editor-panel"
      aria-labelledby="editor-title"
      onValidSubmit={onSave}
    >
      <div className="editor-panel__head">
        <h2 id="editor-title">Edit draft</h2>
        <p className="muted-copy">Preview updates when you save.</p>
      </div>
      <fieldset className="draft-fields" disabled={busy}>
      <CompositionContentFields campaignId={campaignId} busy={busy} draft={draft} savedEmailBody={savedEmailBody} mediaOrigin={mediaOrigin} setField={setField} />
<label><input type="checkbox" checked={draft.trackingEnabled} onChange={event=>onChange({...draft,trackingEnabled:event.target.checked})}/> Track link clicks</label>
      <SegmentPicker draft={draft} onChange={onChange} />
      <AudienceRuleEditor draft={draft} onChange={onChange} />
      <CompositionLinkFields links={draft.links} setLink={setLink} busy={busy} addLink={() => onChange({...draft, links: [...draft.links, {label: '', destinationUrl: ''}]})} removeLink={index => {const template=authoredHtmlTemplate(draft.emailBody);for(const anchor of template.content.querySelectorAll('a')) if(anchor.getAttribute('href')===draft.links[index].destinationUrl) anchor.replaceWith(document.createTextNode(anchor.textContent??''));onChange({...draft,emailBody:authoredEditorHtml(template), links: draft.links.filter((_link, itemIndex) => itemIndex !== index)});}} />
      <CompositionStepFields steps={draft.steps} storeTimezone={storeTimezone} setSteps={steps=>onChange({...draft,steps})} />
      </fieldset>
      <div className="editor-panel__actions">
        <button className="secondary-action" type="submit" disabled={busy}>
          Save full draft
        </button>
      </div>
    </ValidationForm>
  );
}
