export const productRoles = ['owner', 'admin', 'manager', 'author', 'analyst', 'support'] as const;
export type ProductRole = typeof productRoles[number];

export type Capability =
  | 'session.self' | 'campaign.read' | 'draft.write' | 'campaign.approve' | 'campaign.send' | 'campaign.test'
  | 'flow.read' | 'flow.activate' | 'report.read' | 'contact.read' | 'contact.unmasked'
  | 'contact.subscribe' | 'contact.optout' | 'contact.privacy-request' | 'contact.erase'
  | 'audience.import' | 'audience.export' | 'segment.read' | 'segment.manage' | 'form.manage'
  | 'integration.manage' | 'activity.read' | 'operators.manage' | 'settings.manage'
  | 'provider.connect' | 'installation.erase' | 'unclassified';

const grants: Record<Exclude<ProductRole, 'owner' | 'admin'>, readonly Capability[]> = {
  manager: ['session.self', 'campaign.read', 'draft.write', 'campaign.approve', 'campaign.send', 'campaign.test',
    'flow.read', 'flow.activate', 'report.read', 'contact.read', 'contact.unmasked', 'contact.subscribe',
    'contact.optout', 'contact.privacy-request', 'segment.read', 'segment.manage', 'form.manage', 'integration.manage'],
  author: ['session.self', 'campaign.read', 'draft.write', 'campaign.test', 'contact.read', 'contact.unmasked', 'flow.read', 'contact.subscribe', 'segment.read', 'form.manage'],
  analyst: ['session.self', 'campaign.read', 'flow.read', 'report.read', 'contact.read'],
  support: ['session.self', 'contact.read', 'contact.optout', 'contact.privacy-request'],
};

export function hasPermission(role: ProductRole, capability: Capability): boolean {
  if (role === 'owner') return true;
  if (role === 'admin') return capability !== 'provider.connect' && capability !== 'installation.erase';
  return grants[role]?.includes(capability) ?? false;
}

/** Accept a pathname, path with query, or absolute request URL. Malformed paths fail closed. */
export function permissionLocation(path: string): URL | undefined {
  try {
    const url = new URL(path, 'https://mango.invalid');
    // Avoid policy/router disagreement on encoded separators and path aliases.
    if (/%(?:2f|5c|00)/i.test(url.pathname) || url.pathname.includes('\\')) return undefined;
    return url;
  } catch { return undefined; }
}

/** Every operator API request gets a capability; unknown APIs are administrative only.
 * Public capture, provider webhooks and scoped integration APIs use their own admission.
 * Call with the full request URL so CSV export cannot be mistaken for a masked read.
 */
export function requiredPermission(method: string, path: string): Capability {
  const location = permissionLocation(path);
  if (!location) return 'unclassified';
  const p = location.pathname.replace(/\/+$/, '') || '/';
  const verb = method.toUpperCase();
  const read = verb === 'GET' || verb === 'HEAD';
  if ((read && p === '/api/operator') || (verb === 'POST' && p === '/api/auth/signout')) return 'session.self';
  if (/^\/api\/(?:operator\/sessions|sessions\/self)(?:\/[^/]+)?$/.test(p)) return 'session.self';

  if (!read && /^\/api\/settings\/sender\/(?:domain-authentication|tracking-domain)$/.test(p)) return 'provider.connect';
  // Billing-bearing connection changes remain Owner-only, including future authorities.
  if (!read && /^\/api\/(?:settings\/(?:sending|sms|twilio|providers|stripe|woocommerce)|sending\/connection|sms\/connection)(?:\/|$)/.test(p)) return 'provider.connect';
  if (/^\/api\/installation(?:\/(?:erase|delete|reset))?$/.test(p) && !read) return 'installation.erase';
  if (/^\/api\/(?:operators|invitations)(?:\/|$)/.test(p)) return 'operators.manage';
  if (/^\/api\/(?:activity|activity-log)(?:\/|$)/.test(p)) return 'activity.read';
  if (/^\/api\/settings\/integrations\/audit(?:\/|$)/.test(p)) return 'activity.read';
  if (/^\/api\/settings\/integrations(?:\/[^/]+)?$/.test(p)
    || /^\/api\/settings\/integrations\/reviews-loyalty\/[^/]+$/.test(p)
    || /^\/api\/store(?:\/(?:sync|observations))?$/.test(p)) return 'integration.manage';
  if (p === '/api/settings/link-hosts') return 'campaign.approve';
  if(p==='/api/editor/config')return 'provider.connect';
  if (/^\/api\/settings(?:\/|$)/.test(p)) return 'settings.manage';
  if (/^\/api\/portability(?:\/|$)/.test(p)) {
    return /\/(?:import|restore)(?:\/|$)/.test(p) ? 'audience.import' : 'audience.export';
  }
  if (read && p === '/api/audience/signup/refusals') return 'form.manage';
  if (/^\/api\/audience\/(?:signup-allowance|signup-limits)(?:\/|$)/.test(p)) return 'settings.manage';
  if (/^\/api\/(?:forms(?:\/[^/]+(?:\/(?:publish|kiosk))?)?|audience\/signup)$/.test(p)) return 'form.manage';
  if (/^\/api\/audience\/segments(?:\/[^/]+)?$/.test(p)) return read ? 'segment.read' : 'segment.manage';
  if (p === '/api/campaigns/export') return 'audience.export';
  if (p === '/api/audience/export') return 'audience.export';
  if (/^\/api\/audience\/(?:import[^/]*|archives|archive-preview)(?:\/|$)/.test(p)) return 'audience.import';
  if (/^\/api\/audience\/erasures(?:\/|$)/.test(p)) return 'contact.erase';
  if (read && (p === '/api/audience' || /^\/api\/contacts(?:\/[^/]+)?$/.test(p))) return 'contact.read';
  if (read && /^\/api\/contacts\/[^/]+\/rfm$/.test(p)) return 'report.read';
  if (/^\/api\/contacts\/[^/]+\/(?:optout|opt-out|unsubscribe)$/.test(p) && verb === 'POST') return 'contact.optout';
  if (/^\/api\/contacts\/[^/]+\/(?:privacy-requests|erasure-request)$/.test(p)) return 'contact.privacy-request';
  if (p === '/api/contacts/consent' && verb === 'POST') return 'contact.subscribe';
  if (/^\/api\/contacts\/[^/]+$/.test(p) && verb === 'DELETE') return 'contact.erase';
  if (/^\/api\/contacts\/merge(?:-preview)?$/.test(p)) return 'settings.manage';
  if (/^\/api\/audience\/sms-services$/.test(p)) return 'contact.unmasked';

  if (/^\/api\/insights(?:\/(?:open-tracking|attribution-policy|retention|deliverability|list-growth|campaign-performance))?$/.test(p)) {
    return read ? (location.searchParams.get('format') === 'csv' ? 'audience.export' : 'report.read') : 'settings.manage';
  }
  if (/^\/api\/campaigns\/[^/]+\/test-sends?$/.test(p)) return 'campaign.test';
  if (/^\/api\/campaigns\/[^/]+\/(?:recipients|clickers|engagement|results)$/.test(p) && read) {
    return location.searchParams.get('format') === 'csv' ? 'audience.export' : 'report.read';
  }
  if (/^\/api\/campaigns\/[^/]+\/report-segment$/.test(p)) return 'segment.manage';
  if (/^\/api\/campaigns\/[^/]+\/(?:approve|reapprove|dormancy|link-hosts|checks\/[^/]+\/acknowledge|publications(?:\/[^/]+)?)$/.test(p) && !read) return 'campaign.approve';
  if (/^\/api\/campaigns\/[^/]+\/checks$/.test(p) && verb === 'POST') return 'draft.write';
  if (/^\/api\/campaigns\/[^/]+\/(?:send|pause|resume|cancel)$/.test(p) && !read) return 'campaign.send';
  if(read&&/^\/api\/campaigns\/[^/]+\/approval-requests$/.test(p))return 'campaign.read';
  if (/^\/api\/campaigns\/[^/]+\/request-approval$/.test(p)) return 'draft.write';
  if (/^\/api\/campaigns\/[^/]+\/design-jobs$/.test(p)
    || /^\/api\/design-jobs\/[^/]+\/(?:choose|close|layerdoc|candidates\/[^/]+\/image)$/.test(p)
    || /^\/api\/(?:campaign-assets|campaign-templates(?:\/[^/]+\/start)?|campaign-authoring(?:\/(?:audience|email-size))?|campaign-starters|campaign-revisions\/[^/]+)$/.test(p)) return 'draft.write';
  if(p==='/api/decision-desk')return 'draft.write';
  if (read && (['/api/campaigns'].includes(p)
    || /^\/api\/campaigns\/[^/]+(?:\/(?:review|followup|followup-parent|publications))?$/.test(p)
    || /^\/api\/proposals\/[^/]+$/.test(p))) return 'campaign.read';
  if (verb === 'POST' && (p === '/api/campaigns' || p === '/api/proposals/generate'
    || /^\/api\/campaigns\/[^/]+\/(?:edit-schedule|followup|duplicate)$/.test(p)
    || /^\/api\/proposals\/[^/]+\/(?:dismiss|adopt)$/.test(p))) return 'draft.write';
  if (/^\/api\/imported-history(?:\/|$)/.test(p)) return 'audience.import';
  if (/^\/api\/flows\/[^/]+\/(?:activate|pause|resume|stop)$/.test(p) && !read) return 'flow.activate';
  if (read && /^\/api\/flows(?:\/[^/]+)?$/.test(p)) return 'flow.read';
  if ((p === '/api/flows' && verb === 'POST') || (/^\/api\/flows\/[^/]+$/.test(p) && verb === 'PATCH')) return 'draft.write';
  return 'unclassified';
}
