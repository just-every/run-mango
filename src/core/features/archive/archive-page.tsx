import { PublicPage } from '../site/PublicPage';
import type { PublicIssue } from './service';
import './archive.css';
const date=(time:number)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(time);
export function ArchivePage({issues,page,hasMore}:{issues:Omit<PublicIssue,'body'>[];page:number;hasMore:boolean}) {
  return <PublicPage current="other" className="newsletter-archive"><div className="archive-page">
    <div className="archive-masthead"><p className="eyebrow">Published letters</p><span aria-hidden="true"/><a href="/archive/feed.xml">RSS feed ↗</a></div>
    <section className="archive-hero"><div><h1>Newsletter <span>archive</span></h1><p>Notes, news and stories from our newsletter. Read a past issue or get the next one in your inbox.</p></div><a className="archive-subscribe" href="/subscribe">Subscribe <span aria-hidden="true">→</span></a></section>
    <section aria-label="Published newsletters">{issues.length?issues.map(entry=><article className="archive-entry" key={entry.id}>
      <time dateTime={new Date(entry.sentAt).toISOString()}>{date(entry.sentAt)}</time><span className="archive-bullet" aria-hidden="true"/>
      <div><h2><a href={`/archive/${entry.id}`}>{entry.title}</a></h2><p>{entry.description}</p><small>{entry.sender}</small></div>
    </article>):<p className="archive-empty">No newsletters have been published yet.</p>}</section>
    {page>0||hasMore?<nav className="archive-pagination" aria-label="Archive pages">{page>0?<a href={`/archive?page=${page-1}`}>← Newer issues</a>:null}{hasMore?<a href={`/archive?page=${page+1}`}>Older issues →</a>:null}</nav>:null}
  </div></PublicPage>;
}
export function IssuePage({issue}:{issue:PublicIssue}) {
  return <PublicPage current="other" className="newsletter-archive"><article className="archive-page archive-issue">
    <a className="archive-back" href="/archive">← All newsletters</a><header><p className="eyebrow">{issue.sender} · <time dateTime={new Date(issue.sentAt).toISOString()}>{date(issue.sentAt)}</time></p><h1>{issue.title}</h1><p className="archive-description">{issue.description}</p></header>
    <div className="archive-body" dangerouslySetInnerHTML={{__html:issue.body}}/>
    <footer className="archive-issue-footer"><p>Enjoyed this letter?</p><a className="archive-subscribe" href="/subscribe">Get the next issue →</a></footer>
  </article></PublicPage>;
}
