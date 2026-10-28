import type { Hono } from 'hono';
import { ToolRefusal, type ResourceContext, type ToolContext } from '@/vendor/base/agent-door/index.ts';
import { agentAction } from './context';
import { hasPermission, requiredPermission } from '../auth/permissions';
import { createAuthRepository } from '../auth/repository';
import { productAuthority } from '../auth/product-roles';
import { contactPrivacyRole, projectPrivateResponse } from '../auth/response-privacy';
import type { Platform } from '@/core/shared/platform';
import type { AuthenticatedOperator } from '../auth/service';

export async function nativeOperator(platform: Platform, personId: string): Promise<AuthenticatedOperator> {
  const db = platform.database.$client;
  const identity = await db.prepare("SELECT id,email,display_name FROM oa_operators WHERE id=? AND status='active'")
    .bind(personId).first<{id: string; email: string; display_name: string}>();
  if (!identity) throw new ToolRefusal('unauthenticated');
  const profile = await createAuthRepository(platform.database).projectOperator(personId, false);
  const authority = await productAuthority(db, personId);
  if (!profile || !authority) throw new ToolRefusal('unauthenticated');
  return {...profile, email: identity.email, displayName: identity.display_name,
    role: authority.role, unmaskedContacts: Boolean(authority.unmaskedContacts)};
}

export function nativeGateway(platform: Platform, native: Hono<any>) {
  return async (ctx: ToolContext, method: string, path: string, body?: unknown) => {
    const operator = await nativeOperator(platform, ctx.person.id);
    if (!hasPermission(operator.role, requiredPermission(method, path))) throw new ToolRefusal('role_forbidden');
    // This is an internal service call carrying an admitted principal, never a
    // synthetic person session. The same native route validators/services run.
    let payload:BodyInit|undefined=body===undefined?undefined:JSON.stringify(body);
    const headers:Record<string,string>={'Content-Type':'application/json',Origin:ctx.origin};
    if(path==='/api/campaign-assets'&&body){
      const value=body as {base64:string;contentType:string},form=new FormData();
      let bytes:Uint8Array<ArrayBuffer>;
      try{bytes=Uint8Array.from(atob(value.base64),char=>char.charCodeAt(0));}catch{throw new ToolRefusal('invalid_arguments');}
      form.set('file',new Blob([bytes],{type:value.contentType}),'campaign-image');
      payload=form;delete headers['Content-Type'];
    }
    const response = await agentAction.run(ctx, () => native.fetch(new Request(new URL(path, ctx.origin), {
      method, headers, ...(payload===undefined?{}:{body:payload}),
    })));
    const value = await response.json().catch(()=>({error:'native_unavailable'})) as Record<string, unknown>;
    if (!response.ok) throw new ToolRefusal(typeof value.error === 'string' ? value.error
      : typeof value.kind === 'string' ? value.kind : 'native_refused', 'Native action refused', {status: response.status});
    if(path==='/api/settings/sending'&&value.connection&&typeof value.connection==='object')delete (value.connection as Record<string,unknown>).lastFour;
    return method === 'GET' ? projectPrivateResponse(contactPrivacyRole(operator), path, value) : value;
  };
}

export async function resourcePermission(platform: Platform, ctx: ResourceContext, capability: Parameters<typeof hasPermission>[1]) {
  const operator = await nativeOperator(platform, ctx.person.id);
  return hasPermission(operator.role, capability) ? operator : null;
}
