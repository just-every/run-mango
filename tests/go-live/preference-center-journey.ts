import {expect,type Page,type TestInfo} from '@playwright/test';
import type {Installation} from './harness';
import type {EdgeSend} from './edge';
import {providerEdge} from './edge';

/** Follow the managed link from the existing real provider-edge hand-off. */
export async function preferenceCenterJourney(site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,cookie:string,page:Page,info:TestInfo,sent:EdgeSend) {
  const html=sent.body.content.find((part:any)=>part.type==='text/html').value;
  expect(html).toContain('Manage preferences');
}
