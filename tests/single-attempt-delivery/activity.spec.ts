import { test, expect } from '@playwright/test';
import { reconcileSendgrid } from '../../src/core/platform/adapters/sendgrid-activity';
import { parseSendgridFacts } from '../../src/core/features/lifecycle/sendgrid-facts';
import type { DeliveryRequest } from '../../src/core/shared/platform';
const request = {to:'recipient@example.test'} as DeliveryRequest;

test('SEND-008 Activity correlates exact submission and recipient, imports message events once by stable identity', async () => {
  const calls: string[]=[];
  const transport: typeof fetch=async input=>{
    calls.push(String(input));
    if (calls.length%2===1) return Response.json({messages:[{msg_id:'submission-1.filter.node',to_email:request.to},{msg_id:'submission-12.filter.node',to_email:request.to},{msg_id:'submission-1.filter.wrong',to_email:'other@example.test'}]});
    return Response.json({msg_id:'submission-1.filter.node',to_email:request.to,events:[{event_name:'processed',processed:'2026-10-07T00:00:00Z'},{event_name:'delivered',processed:'2026-10-07T00:00:01Z'}]});
  };
  const first=await reconcileSendgrid('test-api-key',request,{providerMessageId:'submission-1'},transport);
  expect(first.facts.map(f=>[f.kind,f.providerMessageId])).toEqual([['accepted','submission-1'],['delivered','submission-1']]);
  expect(await reconcileSendgrid('test-api-key',request,{providerMessageId:'submission-1'},transport)).toEqual(first);
  expect(calls).toHaveLength(4);
  expect(first.exhausted).toBe(true);
});

test('SEND-008 no message ID or unavailable Activity never invents a delivery', async()=>{
  let calls=0;
  const transport:typeof fetch=async()=>{calls++;return new Response(null,{status:403});};
  expect(await reconcileSendgrid('test-api-key',request,{},transport)).toEqual({facts:[],exhausted:true});expect(calls).toBe(0);
  await expect(reconcileSendgrid('test-api-key',request,{providerMessageId:'submission-1'},transport)).rejects.toThrow('provider-read-http-403');expect(calls).toBe(1);
});

test('SEND-008 signed event parser normalizes a SendGrid event message ID to its durable submission ID',async()=>{
  const facts=await parseSendgridFacts({provider:'sendgrid',receivedAt:new Date(),rawBody:JSON.stringify([{event:'delivered',sg_event_id:'event-1',sg_message_id:'submission-1.filter.node',timestamp:1791320000,email:request.to}])});
  expect(facts[0]).toMatchObject({kind:'delivered',providerMessageId:'submission-1',detail:{destination:request.to}});
});
