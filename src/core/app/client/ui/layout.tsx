import {hasPermission,type Capability} from '@/core/features/auth/permissions';
import { Await, Link, Outlet, useRouterState, useLoaderData } from '@tanstack/react-router';
import {useEffect, useRef, useState, type ReactNode} from 'react';

import { productConfig } from '@/ext/config';
import { MangoMark } from '@/core/features/site/brand/MangoMark';
import { SkipLink } from '@/core/features/site/SkipLink';
import './materials';
import { ResourceSnapshot } from '../lib/resource-snapshot';

/** The lockup: Mango's mark and the product name. Its link (and that link's name) belongs to the caller. */
export function Brand() {
  return <span className="app-brand"><MangoMark className="app-brand__mark" /><span className="app-brand__name" data-rer-name>{productConfig.productName}</span></span>;
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const active = to === '/app' ? pathname === to : pathname.startsWith(to);
  return (
    <Link
      className={active ? 'operator-nav__link is-active' : 'operator-nav__link'}
      to={to as never}
      activeOptions={{exact: to === '/app'}}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}

export function OperatorLayout() {
  const operator = useLoaderData({from: '/app'});
  const pathname = useRouterState({select: state => state.location.pathname});
  const locationKey = useRouterState({select: state => state.location.pathname + state.location.searchStr});
  const [open, setOpen] = useState(false), trigger = useRef<HTMLButtonElement>(null), nav = useRef<HTMLElement>(null);
  const destinations = [['/app', 'Decision Desk'], ['/app/campaigns', 'Campaigns'], ['/app/audience', 'Audience'], ['/app/flows', 'Flows'], ['/app/insights', 'Insights'], ...(operator.modules.store ? [['/app/store', 'Store']] : []), ['/app/settings/activity', 'Activity'], ['/app/settings', 'Settings']].filter(([path])=>hasPermission(operator.role,({'/app':'draft.write','/app/campaigns':'campaign.read','/app/audience':'contact.read','/app/flows':'flow.read','/app/insights':'report.read','/app/store':'integration.manage','/app/settings/activity':'activity.read','/app/settings':'session.self'} as Record<string,Capability>)[path]));
  // An unmatched /app path (the app 404) has no current destination, so the toggle reads Menu alone.
  const current = pathname === '/app' ? 'Decision Desk' : destinations.find(([to]) => to !== '/app' && pathname.startsWith(to))?.[1];
  const close = () => {setOpen(false); trigger.current?.focus();};
  useEffect(() => {setOpen(false);}, [pathname]);
  useEffect(() => {if (open) nav.current?.querySelector<HTMLAnchorElement>('a')?.focus();}, [open]);
  const content = (resources: Record<string, unknown>) => <ResourceSnapshot.Provider value={resources}><Outlet /></ResourceSnapshot.Provider>;
  return <div className="operator-layout mango-app"><SkipLink /><header className="operator-header" onKeyDown={event => {if (event.key === 'Escape' && open) {event.preventDefault(); close();}}}>
    <Link className="operator-header__brand" to={operator.role==='support'?'/app/audience':operator.role==='analyst'?'/app/insights':'/app'} aria-label={operator.businessName?`Mango · ${operator.businessName}`:'Mango'}><Brand />{operator.businessName?<small className="operator-business-name">{operator.businessName}</small>:null}</Link>
    <button ref={trigger} className="operator-menu-toggle secondary-action" type="button" aria-expanded={open} aria-controls="operator-navigation" onClick={() => open ? close() : setOpen(true)}>{current ? `Menu · ${current}` : 'Menu'}</button>
    <nav ref={nav} id="operator-navigation" className={`operator-nav${open ? ' is-open' : ''}`} aria-label="Operator navigation" onKeyDown={event => {if (event.key === 'Escape' && open) {event.preventDefault(); close();}}} onClick={event => {if ((event.target as Element).closest('a')) setOpen(false);}}>
      <a className="operator-nav__link" href="/agents">Agents</a>
      {destinations.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
      <form method="post" action="/auth/signout" className="operator-signout"><input type="hidden" name="returnTo" value="/signin" /><span>{operator.displayName}</span><button type="submit" className="operator-nav__link">Sign out</button></form>
    </nav>
  </header><main id="main" tabIndex={-1} className="operator-main">{operator.locationKey === locationKey ? operator.snapshot === undefined ? <Await key={locationKey} promise={operator.resources} fallback={null}>{content}</Await> : content(operator.snapshot) : null}</main></div>;
}

export function LoadState({ error, children }: { error?: string; children?: ReactNode }) {
  if (error) {
    return (
      <section className="load-state inline-error" role="alert">
        <h1>Unable to load this view.</h1>
        <p>{error}</p>
      </section>
    );
  }
  return <>{children ?? <p className="load-state">Loading saved data…</p>}</>;
}

export function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill status-pill--${value}`}>{value.replaceAll('-', ' ')}</span>;
}
