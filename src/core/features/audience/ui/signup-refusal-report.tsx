import {useResource} from '@/core/app/client/lib/use-resource';

type Report={refusedLastHour:number;hours:Array<{hour:number;form:string;reason:string;refusals:number}>};

export function SignupRefusalAlert() {
  const {data}=useResource<Report>('/api/audience/signup/refusals');
  if(!data?.refusedLastHour)return null;
  return <section className="panel" role="alert" aria-label="Signup rate limit">
    <p>{data.refusedLastHour} signups refused by rate limit in the last hour</p>
    <a href="/subscribe">Open form</a> · <a href="/app/settings#signup-allowances">Signup allowances</a>
  </section>;
}

export function SignupRefusalReport() {
  const {data,error}=useResource<Report>('/api/audience/signup/refusals');
  return <section className="panel" id="signup-allowances" aria-labelledby="signup-refusals-title">
    <h2 id="signup-refusals-title">Signup refusals</h2>
    <p>Counts by form, reason and UTC hour. No visitor addresses are included.</p>
    {error?<p role="alert">{error}</p>:!data?<p>Loading refusals…</p>:data.hours.length?<ul>{data.hours.map(row=><li key={`${row.hour}:${row.form}:${row.reason}`}>
      <time>{new Date(row.hour*3600000).toISOString().slice(0,16).replace('T',' ')} UTC</time> · {row.form} · {row.reason.replaceAll('-',' ')}: {row.refusals}
    </li>)}</ul>:<p>No refusals recorded.</p>}
  </section>;
}
