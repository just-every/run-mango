import { copy } from '../copy';
import { Icon } from '../icons/Icon';
import { Paper } from '../../site/paper/Paper';
import { Art } from '../../site/drawings/Art';
import { Arrow } from './decor/Arrow';
import { Stamp } from '../../site/paper/Stamp';
import { sample } from './sample';

const { account, rows, csv } = sample.own;

/** The owner's account, stamped with a mango, with a CSV of readers and their consent sliding out as an export. */
export function AccountArt() {
  return (
    <Art label={copy.own.art} className="band-art account-art">
      <Paper w={236} h={200} seed={81} className="o-account">
        <span className="o-title"><Icon name="account" className="o-title-icon" />{account}</span>
        {rows.map((row) => <span key={row} className="o-row"><i />{row}</span>)}
      </Paper>
      <Stamp className="o-stamp" />
      <Arrow name="across" className="o-arrow" />
      <Paper w={226} h={150} seed={83} className="o-sheet">
        <span className="o-sheet-name"><Icon name="download" className="o-sheet-icon" />{csv.name}</span>
        <span className="o-grid">
          {csv.head.map((cell) => <b key={cell}>{cell}</b>)}
          {csv.rows.flatMap((row) => row.map((cell, index) => <span key={`${row[0]}-${index}`}>{cell}</span>))}
        </span>
      </Paper>
    </Art>
  );
}
