import {useResource} from '@/core/app/client/lib/use-resource';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';

type Report={refusedLastHour:number;challengeConfigured:boolean;hours:Array<{hour:number;form:string;reason:string;refusals:number}>};

export function SignupRefusalAlert() {
  const {data}=useResource<Report>('/api/audience/signup/refusals');
  if(!data)return null;
  return <>{data.refusedLastHour?<section className="panel" role="alert" aria-label="Signup rate limit">
    <p>{data.refusedLastHour} signups refused by rate limit in the last hour</p>
    <a href="/subscribe">Open form</a> · <a href="/app/settings#signup-allowances">Signup allowances</a>
  </section>:null}</>;
}

export function SignupRefusalReport() {
  const formatDate = useDateFormatter();
  const {data,error}=useResource<Report>('/api/audience/signup/refusals');
  return <section className="panel" id="signup-refusals" aria-labelledby="signup-refusals-title">
    <h2 id="signup-refusals-title">Signup refusals</h2>
    <p>Counts by form, reason and UTC hour. No visitor addresses are included.</p>
    {error?<p role="alert">{error}</p>:!data?<p>Loading refusals…</p>:data.hours.length?<ul>{data.hours.map(row=><li key={`${row.hour}:${row.form}:${row.reason}`}>
      <time>{formatDate(row.hour*3600000)}</time> · {row.form} · {row.reason.replaceAll('-',' ')}: {row.refusals}
    </li>)}</ul>:<p>No refusals recorded.</p>}
  </section>;
}
