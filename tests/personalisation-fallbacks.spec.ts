import {expect, test} from '@playwright/test';
import {messageFallbackKeys, messageRendererVersion, renderMessageContent, type MessageRevision} from '../src/core/features/campaigns/message-content';

function revision(overrides: Partial<MessageRevision> = {}): MessageRevision {
  return {emailSubject: '', preheader: '', emailBody: '', emailText: '', smsBody: '', physicalAddress: '5 Main & Market <Street>', ...overrides};
}
const token = (key: string) => `{{${key} | fallback: "Friend"}}`;

test('[MSG-008] missing, null and empty values use fallbacks; nonempty strings including whitespace resolve', () => {
  const saved = revision({emailSubject: ['missing', 'nullValue', 'empty', 'resolved', 'whitespace', 'zero'].map(token).join(' / ')});
  const values = {nullValue: null, empty: '', resolved: 'Ada', whitespace: ' ', zero: '0'};
  expect(messageFallbackKeys(saved, 'email', values)).toEqual(['missing', 'nullValue', 'empty']);
  expect(renderMessageContent(saved, {values, unsubscribeUrl: 'https://preview.invalid/unsubscribe'}).subject).toBe('Friend / Friend / Friend / Ada /   / 0');
});

test('[MSG-008] email union includes subject, preheader and both bodies while deduplicating authored keys', () => {
  const saved = revision({emailSubject: token('subject'), preheader: token('preheader'), emailBody: token('body') + token('subject'), emailText: token('text') + token('body'), smsBody: token('sms')});
  expect(messageFallbackKeys(saved, 'email', {})).toEqual(['subject', 'preheader', 'body', 'text']);
  expect(messageFallbackKeys(saved, 'sms', {})).toEqual(['sms']);
  expect(messageFallbackKeys(saved, 'email', {subject: 'Ada', preheader: 'Offer', body: 'Copy', text: 'Copy'})).toEqual([]);
});

test('[MSG-008] managed tokens and malformed authored tokens invent no fallback diagnostics', () => {
  const saved = revision({emailBody: '{{physical_address}} {{unsubscribe_url}} {{unknown}} {{empty | fallback: ""}} {{broken | fallback: "Friend}} {{unclosed', smsBody: '{{unsubscribe_url}}'});
  expect(messageFallbackKeys(saved, 'email', {})).toEqual([]);
  expect(messageFallbackKeys(saved, 'sms', {})).toEqual([]);
});

test('[MSG-008] inherited values and Object prototype keys remain fallback values; own strings resolve', () => {
  const saved = revision({emailText: token('inherited') + token('constructor') + token('toString') + token('own')});
  const values = Object.assign(Object.create({inherited: 'Wrong', constructor: 'Wrong'}), {own: 'Ada'});
  expect(messageFallbackKeys(saved, 'email', values)).toEqual(['inherited', 'constructor', 'toString']);
  expect(renderMessageContent(saved, {values, unsubscribeUrl: 'https://preview.invalid/unsubscribe'}).text).toBe('FriendFriendFriendAda');
  expect(messageFallbackKeys(saved, 'email', {...values, constructor: 'Own constructor', toString: 'Own string', inherited: 'Own value'})).toEqual([]);
});

test('[MSG-008][BASE-INPUT-002] diagnostics leave escaping, managed capabilities and exact rendered bytes unchanged', () => {
  const saved = revision({emailSubject: '{{name | default: Guest}}', preheader: 'Hi & welcome', emailBody: '<p>{{name | default: Guest}} / {{missing | fallback: "<Guest & friend>"}} / {{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>', emailText: '{{name | default: Guest}} / {{missing | fallback: "<Guest & friend>"}}', smsBody: '{{missing | fallback: "<Guest & friend>"}}'});
  const values = {name: '<Ada & Co>'};
  const options = {values, unsubscribeUrl: 'https://preview.invalid/unsubscribe?x=1&y=2'};
  const before = JSON.stringify({saved, values});
  expect(messageFallbackKeys(saved, 'email', values)).toEqual(['missing']);
  expect(messageFallbackKeys(saved, 'sms', values)).toEqual(['missing']);
  expect(renderMessageContent(saved, options)).toEqual({subject: '<Ada & Co>', preheader: 'Hi & welcome', html: '<div aria-hidden="true" style="display:none;max-height:0;overflow:hidden;opacity:0">Hi &amp; welcome</div><p>&lt;Ada &amp; Co&gt; / &lt;Guest &amp; friend&gt; / 5 Main &amp; Market &lt;Street&gt;</p><a href="https://preview.invalid/unsubscribe?x=1&amp;y=2">Unsubscribe</a>', text: '<Ada & Co> / <Guest & friend>', sms: '<Guest & friend>'});
  expect(JSON.stringify({saved, values})).toBe(before);
  expect(messageRendererVersion).toBe('mango-message-v2');
});
