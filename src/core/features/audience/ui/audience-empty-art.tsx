import '@/core/app/client/ui/materials';
import { Paper } from '@/core/features/site/paper/Paper';
import { Stamp } from '@/core/features/site/paper/Stamp';

/** Beside "The ledger is empty": a blank address card with its stamp waiting on it. Decorative; the text says it. */
export function AudienceEmptyArt() {
  return (
    <div className="art empty-art audience-empty-art" aria-hidden="true">
      <div className="art-inner">
        <Paper w={150} h={100} seed={27} className="audience-empty-card"><span className="empty-art-lines"><i /><i /><i /></span></Paper>
        <Stamp className="audience-empty-stamp" />
      </div>
    </div>
  );
}
