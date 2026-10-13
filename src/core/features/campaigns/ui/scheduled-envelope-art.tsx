import '@/core/app/client/ui/materials';
import { Envelope } from '@/core/features/site/drawings/Envelope';

/** Beside a waiting campaign's schedule head: a letter stamped and not yet posted. Decorative; the state pill says it. */
export function ScheduledEnvelopeArt() {
  return (
    <div className="art scheduled-head__art" aria-hidden="true">
      <div className="art-inner">
        <Envelope className="scheduled-head__envelope" seed={55} cancelled={false} lines={false} />
      </div>
    </div>
  );
}
