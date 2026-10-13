import { formatDate, titleCase } from '@/core/app/client/lib/format';

export type ContactConsentEvidence = {
  id: string;
  channel: string;
  brandOrLegalSender: string;
  messageCategory: string;
  frequencyDisclosure: string;
  destinationJurisdiction: string;
  captureMethod: string;
  captureSource: string;
  consentText: string;
  consentVersion: string;
  occurredAt: string;
  confirmationRequired: boolean;
  confirmedAt: string | null;
  captureIp: string | null;
  confirmationIp: string | null;
};

export type ContactImportObservation = {
  id: string;
  source_file: string;
  source_row: number;
  source_status: string;
  source_display_name: string | null;
  capture_method: string;
  capture_source: string;
  optin_time: string | null;
  confirm_time: string | null;
  capture_ip: string | null;
  confirmation_ip: string | null;
};

function ConfirmationState({ evidence }: { evidence: ContactConsentEvidence }) {
  const value = evidence.confirmedAt
    ? 'Confirmed'
    : evidence.confirmationRequired ? 'Awaiting confirmation' : 'Confirmation not required';
  const style = evidence.confirmedAt ? 'good' : evidence.confirmationRequired ? 'pending' : 'neutral';
  return <span className={`audience-import-status audience-import-status--${style}`}>{value}</span>;
}

export function ContactConsentEvidencePanel({ consent, observations }: {
  consent: ContactConsentEvidence[];
  observations: ContactImportObservation[];
}) {
  return (
    <>
      <section className="panel contact-evidence" aria-labelledby="consent-evidence-title">
        <p className="eyebrow">Saved permission records</p>
        <h2 id="consent-evidence-title">Consent evidence</h2>
        {consent.length ? (
          <div className="contact-evidence-list">
            {consent.map((evidence) => (
              <article className="contact-evidence-card" key={evidence.id}>
                <div className="contact-evidence-card__heading">
                  <div>
                    <strong>{titleCase(evidence.channel)} consent · {evidence.brandOrLegalSender}</strong>
                    <p>{evidence.messageCategory} · {evidence.frequencyDisclosure}</p>
                  </div>
                  <ConfirmationState evidence={evidence} />
                </div>
                <dl className="contact-evidence-fields">
                  <div><dt>Captured</dt><dd>{formatDate(evidence.occurredAt)}</dd></div>
                  <div><dt>Confirmed</dt><dd>{formatDate(evidence.confirmedAt)}</dd></div>
                  <div><dt>Destination jurisdiction</dt><dd>{evidence.destinationJurisdiction}</dd></div>
                  <div><dt>Consent version</dt><dd>{evidence.consentVersion}</dd></div>
                  <div><dt>Capture method</dt><dd>{evidence.captureMethod}</dd></div>
                  <div><dt>Capture source</dt><dd>{evidence.captureSource}</dd></div>
                  <div><dt>Capture IP</dt><dd>{evidence.captureIp || 'Not recorded'}</dd></div>
                  <div><dt>Confirmation IP</dt><dd>{evidence.confirmationIp || 'Not recorded'}</dd></div>
                  <div className="contact-evidence-fields__wide"><dt>Affirmative text</dt><dd>{evidence.consentText}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : <p className="muted-copy">No consent evidence has been saved for this contact.</p>}
      </section>

      <section className="panel contact-evidence" aria-labelledby="import-observations-title">
        <p className="eyebrow">Original CSV provenance</p>
        <h2 id="import-observations-title">Import source observations</h2>
        {observations.length ? (
          <div className="contact-evidence-list">
            {observations.map((observation) => (
              <article className="contact-evidence-card" key={observation.id}>
                <div className="contact-evidence-card__heading">
                  <div>
                    <strong>{observation.source_file} · row {observation.source_row}</strong>
                    <p>{observation.capture_method} · {observation.source_status}</p>
                  </div>
                  <span className="audience-import-status audience-import-status--neutral">Source record</span>
                </div>
                <dl className="contact-evidence-fields">
                  <div><dt>Name in the file</dt><dd>{observation.source_display_name || 'Not recorded'}</dd></div>
                  <div><dt>Capture source</dt><dd>{observation.capture_source}</dd></div>
                  <div><dt>Original marketing status</dt><dd>{titleCase(observation.source_status)}</dd></div>
                  <div><dt>Original opt-in time</dt><dd>{formatDate(observation.optin_time)}</dd></div>
                  <div><dt>Original confirmation time</dt><dd>{formatDate(observation.confirm_time)}</dd></div>
                  <div><dt>Opt-in IP</dt><dd>{observation.capture_ip || 'Not recorded'}</dd></div>
                  <div><dt>Confirmation IP</dt><dd>{observation.confirmation_ip || 'Not recorded'}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : <p className="muted-copy">No source observations were saved from an import.</p>}
      </section>
    </>
  );
}
