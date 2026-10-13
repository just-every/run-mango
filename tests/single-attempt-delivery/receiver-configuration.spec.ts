import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createReceiptConnector} from '../../src/core/features/sender-verification/qa-inbox';
import {senderBinding} from '../../src/core/features/sender-verification/identity';
import type {AppConfig} from '../../src/core/shared/platform';
const recipient='diagnostic@customer.example';
// Installation-owned receipt endpoints must not depend on the author's QA service.
test('installation can select its own public HTTPS receipt endpoint',()=>{
 expect(()=>createReceiptConnector('https://receipts.customer.example/receipts?token=install-token',recipient)).not.toThrow();
});
test('product receipt connector contains no hardcoded endpoint or recipient',()=>{
 const source=readFileSync(new URL('../../src/core/features/sender-verification/qa-inbox.ts',import.meta.url),'utf8');
 expect(source).not.toMatch(/https?:\/\//i);
 expect(source).not.toMatch(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});

for (const [index,endpoint] of [
 'http://receipts.customer.example/receipts?token=test-token',
 'https://127.0.0.1/receipts?token=test-token',
 'https://0x7f000001/receipts?token=test-token',
 'https://[::1]/receipts?token=test-token',
 'https://169.254.169.254/receipts?token=test-token',
 'https://localhost/receipts?token=test-token',
 'https://mail.localhost/receipts?token=test-token',
 'https://mail.internal/receipts?token=test-token',
 'https://mail.local/receipts?token=test-token',
 'https://mail.home.arpa/receipts?token=test-token',
 'https://user:password@receipts.customer.example/receipts?token=test-token',
 'https://receipts.customer.example:8443/receipts?token=test-token',
 'https://receipts.customer.example/other?token=test-token',
 'https://receipts.customer.example/receipts?token=test-token#fragment',
 'https://receipts.customer.example/receipts?token=',
 'https://receipts.customer.example/receipts?token=one&token=two',
 'https://receipts.customer.example/receipts?token=test-token&to=someone@example.test',
].entries()) test(`receipt endpoint policy rejects unsafe configuration ${index}`,()=>{
 expect(()=>createReceiptConnector(endpoint,recipient)).toThrow('receiver-configuration-invalid');
});


test('receipt configuration requires an explicit bare recipient and protects parse errors',()=>{
 for(const recipient of [undefined,'','Name <diagnostic@customer.example>','diagnostic@localhost',' diagnostic@customer.example','bad\n@customer.example'])
  expect(()=>createReceiptConnector('https://receipts.customer.example/receipts?token=test-secret',recipient)).toThrow(/^receiver-configuration-invalid$/);
 expect(()=>createReceiptConnector('not-a-url-with-test-secret',recipient)).toThrow(/^receiver-configuration-invalid$/);
});
test('connector identity binds configured endpoint and recipient without exposing the token',()=>{
 const make=(host:string,to=recipient)=>createReceiptConnector(`https://${host}/receipts?token=test-secret`,to);
 const first=make('receipts.customer.example');
 expect(first.recipient).toBe(recipient);
 expect(first.id).not.toContain('test-secret');
 expect(first.id).not.toBe(make('receipts.second.example').id);
 expect(first.id).not.toBe(make('receipts.customer.example','second@customer.example').id);
});
test('receipt credential rotation invalidates sender binding without exposing credentials',async()=>{
 const config={publicBaseUrl:new URL('https://mango.customer.example'),sessionSigningKey:'test-session-signing-key',mailProviderApiKey:'test-provider-key',
  mailSender:{displayName:'Mango',fromEmail:'sender@customer.example'},mailboxReceiptUrl:'https://receipts.customer.example/receipts?token=test-first',mailboxReceiptRecipient:recipient} as AppConfig;
 const first=await senderBinding(config,'connector');
 const second=await senderBinding({...config,mailboxReceiptUrl:'https://receipts.customer.example/receipts?token=test-second'},'connector');
 expect(first.credentialGeneration).not.toBe(second.credentialGeneration);
 expect(JSON.stringify(first)).not.toContain('test-first');
 expect(JSON.stringify(second)).not.toContain('test-second');
});
