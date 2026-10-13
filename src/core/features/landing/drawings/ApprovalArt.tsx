import { copy } from '../copy';
import { Paper } from '../../site/paper/Paper';
import { Art } from '../../site/drawings/Art';
import { Postmark } from '../../site/drawings/Postmark';
import { Stamp } from '../../site/paper/Stamp';
import { Padlock, Pencil } from './glyphs';
import { sample } from './sample';

const { subject, draft, approved, postmark } = sample.approval;

/**
 * The same letter twice: the draft, still being edited with a pencil, behind the approved copy, locked, which carries the
 * mango stamp and the APPROVED postmark side by side across its top, both inside the card.
 */
export function ApprovalArt() {
  return (
    <Art label={copy.approval.art} className="band-art approval-art">
      <Paper w={190} h={210} seed={51} tone="warm" className="ap-card ap-draft">
        <span className="ap-tag ap-tag--draft">{draft}</span>
        <span className="ap-subject">{subject}</span>
        <span className="ap-lines"><i /><i /><i /><i /></span>
      </Paper>
      <Pencil className="ap-pencil" />
      <Paper w={216} h={262} seed={53} className="ap-card ap-approved">
        <div className="ap-postage">
          <Postmark rim={postmark} className="postmark--mirror ap-postmark" />
          <Stamp className="ap-stamp" />
        </div>
        <span className="ap-subject">{subject}</span>
        <span className="ap-lines"><i /><i /><i /></span>
        <span className="ap-lines"><i /><i /><i /></span>
        <span className="ap-tag ap-tag--approved"><Padlock />{approved}</span>
      </Paper>
    </Art>
  );
}
