import './compliance-dashboard.css';
import type {DomainCompliance} from '../compliance-report';
export function ComplianceDashboard({domains,error}:{domains?:DomainCompliance[];error?:string}) {
  return <section className="panel bulk-compliance" aria-labelledby="compliance-title">
    <h2 id="compliance-title">Bulk-sender compliance</h2>
    <p>Gmail, Yahoo and Microsoft requirements for each sending domain. Authentication is the last stored sender check, not a new DNS inspection. Unknown means evidence is missing or expired.</p>
    {error?<p role="alert">Compliance could not be refreshed.</p>:!domains?<p>Loading compliance evidence…</p>:!domains.length?<p>No sending domains recorded yet.</p>:domains.map(domain=><div key={domain.domain} data-compliance-domain={domain.domain}>
      <h3>{domain.domain}</h3>
      <p data-reputation-figures>{domain.figures}</p>
      <div className="table-scroll" role="region" tabIndex={0} aria-label={`${domain.domain} bulk-sender requirements`}>
        <table className="responsive-table insights-table" aria-label={`${domain.domain} bulk-sender compliance`}>
          <thead><tr><th scope="col">Requirement</th><th scope="col">Gmail</th><th scope="col">Yahoo</th><th scope="col">Microsoft</th><th scope="col">Mango evidence</th></tr></thead>
          <tbody>{domain.rows.map(row=><tr key={row.key} data-requirement={row.key} data-state={row.state}>
            <th scope="row">{row.requirement}</th><td data-label="Gmail">{row.gmail}</td><td data-label="Yahoo">{row.yahoo}</td><td data-label="Microsoft">{row.microsoft}</td>
            <td data-label="Mango evidence"><div><strong className={`status-pill status-pill--${row.state==='pass'?'passed':row.state==='warn'?'advisory':row.state==='fail'?'failed':'neutral'}`}>{row.state==='warn'?'Warning':row.state==='fail'?'Fail':row.state==='pass'?'Pass':'Unknown'}</strong><p>{row.value}</p></div></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>)}
  </section>;
}
