import '@/core/app/client/ui/materials';
import { Envelope } from '@/core/features/site/drawings/Envelope';
import { Paper } from '@/core/features/site/paper/Paper';

/** Beside "Nothing drafted yet": the docs welcome pair, a blank lined sheet and its envelope. Decorative; the text says it. */
export function CampaignsEmptyArt() {
  return (
    <div className="art empty-art campaigns-empty-art" aria-hidden="true">
      <div className="art-inner">
        <Paper w={200} h={150} seed={21} className="campaigns-empty-sheet">
          <span className="empty-art-lines"><i /><i /><i /><i /></span>
        </Paper>
        <Envelope className="campaigns-empty-envelope" seed={34} lines={false} />
      </div>
    </div>
  );
}
