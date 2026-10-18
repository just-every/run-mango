import type {MailboxReport} from '../mailbox-report';
import {bounceCategories,bounceLabels} from '../mailbox-taxonomy';
export function MailboxProviders({report,windowDays,error}:{report?:MailboxReport;windowDays?:number;error?:string}) {
  return <section className="panel" aria-labelledby="mailbox-title"><h2 id="mailbox-title">Recipient mailbox providers</h2>
    <p>Signed delivery outcomes and observed clicks, grouped by the address used for each send. Custom domains are Other; their hosting is not inferred.</p>
    {error?<p role="alert">Mailbox outcomes could not be refreshed.</p>:null}
    {!report?<p>Loading mailbox outcomes…</p>:!report.hasSignedOutcomes?<p>Delivery events not connected: no signed email outcomes have been recorded.</p>:<>
      <p>Last {windowDays} days. Counts are message recipients per outcome; outcomes can overlap. Human clicks exclude known scanners. Erased identities and their removed event details cannot be assigned to a mailbox provider.</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Recipient mailbox outcomes"><table className="responsive-table insights-table" aria-label="Recipient mailbox outcomes"><thead><tr><th scope="col">Mailbox provider</th>{['Delivered','Bounced','Complained','Clicked recipients','Human clicks'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{report.rows.map(row=><tr key={row.provider}><th scope="row">{row.provider}</th><td data-label="Delivered">{row.delivered}</td><td data-label="Bounced">{row.bounced}</td><td data-label="Complained">{row.complained}</td><td data-label="Clicked recipients">{row.clicked}</td><td data-label="Human clicks">{row.clicks}</td></tr>)}</tbody></table></div>
      <h3>Bounce reasons</h3><p>Each bounced message appears once under its latest signed reason in this window. Other includes missing or unrecognised diagnostics. A provider-reported content or reputation bounce is included here even when its transport outcome is Failed.</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Mailbox bounce reasons"><table className="responsive-table insights-table" aria-label="Mailbox bounce reasons"><thead><tr><th scope="col">Mailbox provider</th>{bounceCategories.map(reason=><th scope="col" key={reason}>{bounceLabels[reason]}</th>)}</tr></thead><tbody>{report.rows.map(row=><tr key={row.provider}><th scope="row">{row.provider}</th>{bounceCategories.map(reason=><td key={reason} data-label={bounceLabels[reason]}>{row.bounceReasons[reason]}</td>)}</tr>)}</tbody></table></div>
    </>}
  </section>;
}
