import { Art } from '../site/drawings/Art';
import { Envelope } from '../site/drawings/Envelope';
import { Paper } from '../site/paper/Paper';
import { docsCopy } from './copy';

const { welcome } = docsCopy;

/** Under the docs home's title: a line of greeting in the serif, then one line of what the docs cover. */
export function DocsWelcomeLead() {
  return (
    <>
      <p className="docs-welcome-title">{welcome.title}</p>
      <p className="docs-welcome-lead">{welcome.lead}</p>
    </>
  );
}

/** Beside the docs home's title: a small drawing of a written page going out in its envelope. */
export function DocsWelcomeArt() {
  return (
    <Art label={welcome.art} className="docs-welcome-art">
      <Paper w={200} h={150} seed={8} className="dw-sheet">
        <span className="dw-sheet-lines"><i /><i /><i /><i /></span>
      </Paper>
      <Envelope className="dw-envelope" seed={13} />
    </Art>
  );
}
