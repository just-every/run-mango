import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { BodyText } from '@/core/features/site/BodyText';
import type { ChangeEvent } from 'react';
import { maxContactImportRows } from '../import-limits';
import { archiveLimits } from '@/core/features/move-in/archive-limits';

import type { ImportConsent, ImportField, ImportPreset, ImportPreview } from './audience-import-types';

export type SelectedImportFile = {
  name: string;
  file: File;
  preset: string;
};

type AudienceImportSourceFormProps = {
  files: SelectedImportFile[];
  /** One whole account export (.zip): its parts are recognised from folders and headers. */
  archive?: File;
  presets: ImportPreset[];
  fields: ImportField[];
  consent: ImportConsent;
  columns?: ImportPreview['columns'];
  mappings: Record<string, Record<string, string>>;
  canPreview: boolean;
  busy: boolean;
  previewIsCurrent: boolean;
  fileError?: string;
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (fileName: string) => void;
  onRemoveArchive: () => void;
  onPresetChange: (fileName: string, preset: string) => void;
  onMappingChange: (fileName: string, field: string, header: string) => void;
  onConsentChange: (field: keyof ImportConsent, value: string) => void;
  onPreview: () => void;
};

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fieldLabel(field: ImportField) {
  return field.id === 'status' ? 'Email marketing status' : titleCase(field.label);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AudienceImportSourceForm({
  files,
  archive,
  presets,
  fields,
  consent,
  columns,
  mappings,
  busy,
  previewIsCurrent,
  fileError,
  onFilesSelected,
  onRemoveFile,
  onRemoveArchive,
  onPresetChange,
  onMappingChange,
  onConsentChange,
  onPreview,
}: AudienceImportSourceFormProps) {
  const onChooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = '';
  };

  const presetById = new Map(presets.map((preset) => [preset.id, preset]));
  const selectedNames = new Set(files.map((file) => file.name));
  const mappingColumns = archive ? [] : (columns ?? []).filter((column) => selectedNames.has(column.name));

  return (
    <ValidationForm className="audience-import-form" onValidSubmit={onPreview} aria-label="Audience import mapping">
      <section className="panel audience-import-panel" aria-labelledby="import-files-title">
        <div className="audience-import-section-title">
          <span aria-hidden="true">1</span>
          <div>
            <p className="eyebrow">Prepare the source</p>
            <h2 id="import-files-title">Select files and presets</h2>
          </div>
        </div>
        <p className="muted-copy">Choose the preset that matches each CSV export, or one whole account export (.zip). Suppression and opt-out rows are applied before any subscription data.</p>
        <ul className="audience-import-files" aria-label="Selected CSV files">
          {archive ? (
            <li className="audience-import-file">
              <div className="audience-import-file__details">
                <span className="audience-import-file__icon" aria-hidden="true">ZIP</span>
                <div>
                  <strong>{archive.name}</strong>
                  <small>{formatBytes(archive.size)}</small>
                </div>
              </div>
              <button className="audience-import-file__remove" type="button" aria-label={`Remove ${archive.name}`} onClick={onRemoveArchive} disabled={busy}>Remove</button>
              <p className="audience-import-file__description">Whole account export. Each audience status file, the emails and their content, and the templates are recognised from their folders and headers; reports, SMS, events, appointments, ecommerce and gallery files are kept as raw source and never imported.</p>
            </li>
          ) : null}
          {files.map(({ name, file, preset }) => (
            <li className="audience-import-file" key={name}>
              <div className="audience-import-file__details">
                <span className="audience-import-file__icon" aria-hidden="true">CSV</span>
                <div>
                  <strong>{name}</strong>
                  <small>{formatBytes(file.size)}</small>
                </div>
              </div>
              <label className="audience-import-file__preset">
                <span>File preset (required)</span>
                <Field name={`preset.${name}`} label={`Preset for ${name}`} required><select
                  aria-label={`Preset for ${name}`}
                  value={preset}
                  onChange={(event) => onPresetChange(name, event.currentTarget.value)}
                  disabled={busy}
                >
                  <option value="">Choose a preset</option>
                  {presets.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
                </select></Field>
              </label>
              <button
                className="audience-import-file__remove"
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => onRemoveFile(name)}
                disabled={busy}
              >
                Remove
              </button>
              {presetById.get(preset)?.description ? <p className="audience-import-file__description">{presetById.get(preset)?.description}</p> : null}
            </li>
          ))}
        </ul>
        <label className="audience-import-upload">
          <span aria-hidden="true">＋</span>
          <span>Choose CSV files or one account export (required)</span>
          <Field name="files" label="CSV files" validate={() => fileError || (files.length || archive ? undefined : "Choose at least one CSV file or one .zip account export.")}><input aria-label="Choose CSV files" aria-required="true" type="file" accept=".csv,text/csv,.zip,application/zip" multiple onChange={onChooseFiles} disabled={busy || Boolean(archive)} /></Field>
        </label>
        <p className="quiet-caption">Up to 10 files, 10 MB total, and {maxContactImportRows.toLocaleString('en-US')} rows per review. An account export may be up to {Math.round(archiveLimits.archiveBytes / 1048576)} MB.</p>
        <p className="quiet-caption">Large consent or ledger payloads may require smaller files to fit one durable review.</p>
        {fileError ? <p className="inline-error" role="alert">{fileError}</p> : null}
      </section>

      {mappingColumns.length ? (
        <section className="panel audience-import-panel" aria-labelledby="import-mapping-title">
          <div className="audience-import-section-title">
            <span aria-hidden="true">2</span>
            <div>
              <p className="eyebrow">Match the columns</p>
              <h2 id="import-mapping-title">Field mapping</h2>
            </div>
          </div>
          <p className="muted-copy">Map email, E.164 phone, or both. SMS columns carry independent consent; email consent and file presets never subscribe SMS. Missing original evidence keeps that channel non-subscribed.</p>
          <div className="audience-import-mappings">
            {mappingColumns.map((column) => {
              const preset = files.find((file) => file.name === column.name)?.preset;
              const mapping = {...column.mapping, ...mappings[column.name]};
              const destinationError = () => mapping.email || mapping.phone ? undefined : 'Map an email or E.164 phone column.';
              return (
                <fieldset className="audience-import-mapping-file" key={column.name}>
                  <legend>{column.name}</legend>
                  {preset === 'mango' ? (
                    <p className="quiet-caption">Mango exports use their lossless consent-ledger mapping.</p>
                  ) : (
                    <div className="audience-import-mapping-grid">
                      {fields.map((field) => (
                        <label key={field.id}>
                          <span>{fieldLabel(field)}</span>
                          <Field name={`mapping.${column.name}.${field.id}`} label={`${fieldLabel(field)} in ${column.name}`} validate={field.id === 'email' || field.id === 'phone' ? destinationError : undefined}><select
                            aria-label={`${fieldLabel(field)} in ${column.name}`}
                            value={mappings[column.name]?.[field.id] ?? column.mapping[field.id] ?? ''}
                            onChange={(event) => onMappingChange(column.name, field.id, event.currentTarget.value)}
                            disabled={busy || !column.headers.length}
                          >
                            <option value="">Do not map</option>
                            {column.headers.map((header) => <option value={header} key={header}>{header}</option>)}
                          </select></Field>
                        </label>
                      ))}
                    </div>
                  )}
                  {!column.headers.length ? <p className="inline-error" role="alert">No CSV headers were detected for this file.</p> : null}
                </fieldset>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="panel audience-import-panel" aria-labelledby="import-consent-title">
        <div className="audience-import-section-title">
          <span aria-hidden="true">{mappingColumns.length ? '3' : '2'}</span>
          <div>
            <p className="eyebrow">Keep the original scope</p>
            <h2 id="import-consent-title">Email consent evidence</h2>
          </div>
        </div>
        <p className="muted-copy">These details must match what each person actually saw when they opted in. Adding them here cannot create consent or reverse an opt-out.</p>
        <div className="audience-import-consent-grid">
          <label>
            <span>Brand or legal sender</span>
            <input value={consent.brandOrLegalSender} onChange={(event) => onConsentChange('brandOrLegalSender', event.currentTarget.value)} autoComplete="organization" disabled={busy} />
          </label>
          <label>
            <span>Message category</span>
            <input value={consent.messageCategory} onChange={(event) => onConsentChange('messageCategory', event.currentTarget.value)} disabled={busy} />
          </label>
          <label>
            <span>Disclosed frequency</span>
            <input value={consent.frequencyDisclosure} onChange={(event) => onConsentChange('frequencyDisclosure', event.currentTarget.value)} disabled={busy} />
          </label>
          <label>
            <span>Destination jurisdiction</span>
            <input value={consent.destinationJurisdiction} onChange={(event) => onConsentChange('destinationJurisdiction', event.currentTarget.value)} autoComplete="country-name" disabled={busy} />
          </label>
          <label>
            <span>Consent version</span>
            <input value={consent.consentVersion} onChange={(event) => onConsentChange('consentVersion', event.currentTarget.value)} disabled={busy} />
          </label>
          <label className="audience-import-consent-grid__wide">
            <span>Original consent text</span>
            <textarea rows={3} value={consent.consentText} onChange={(event) => onConsentChange('consentText', event.currentTarget.value)} disabled={busy} />
            <small><BodyText text="Enter the disclosure that was shown at the time of opt-in." /></small>
          </label>
        </div>
      </section>

      <div className="audience-import-preview-action">
        <p className="muted-copy">Review counts, consent status, and row warnings before starting the import.</p>
        <button className="primary-action" type="submit" disabled={busy}>
          {busy ? 'Reviewing…' : previewIsCurrent ? 'Refresh preview' : 'Preview import'}
        </button>
      </div>
    </ValidationForm>
  );
}
