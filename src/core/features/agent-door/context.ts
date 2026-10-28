import { AsyncLocalStorage } from 'node:async_hooks';
import type { ToolContext } from '@/vendor/base/agent-door/index.ts';

/** Trusted in-process native action context. Never populated from HTTP headers or cookies. */
export const agentAction = new AsyncLocalStorage<ToolContext>();
export function agentAttribution() {
  const ctx = agentAction.getStore();
  return ctx ? {agent: ctx.actor.agent, sponsor: ctx.actor.for, label: ctx.actor.label,
    approvers: ctx.approvers, consent: ctx.consent ?? null} : undefined;
}

export const agentWriteAdmission = new AsyncLocalStorage<{sessionId:string;operatorId:string;version:number}>();
