import { productConfig } from '@/ext/config';
import { markShapes, markViewBox } from './brand/markArt';
import { pencilPath } from './paper/pencilPath';
import { messageStyles } from './message-styles';
import { fontHead } from './font-head';

/**
 * A page a reader reaches from a link in their mail (confirm a subscription, unsubscribe): the sign-in page's frame as a
 * plain server-rendered string with one inline stylesheet and no scripts. `stamp` puts the mango stamp on the card's
 * corner (a letter on its way); `posted` also strikes a YES postmark beside it (the reader said yes). Without either the
 * card is a plain, respectful note. A `form` posts `confirm=true` to its action; `links` are plain same-site links
 * under the text (including the no-script sign-in answer's return link).
 *
 * Strings rather than React: these routes also run inside Node test harnesses that load them without a JSX runtime. The
 * markup follows the site's Paper, Stamp and Postmark components (paper/Paper.ts, paper/Stamp.ts, drawings/Postmark.tsx)
 * so message-styles.ts can draw it the same way; keep them in step.
 */
export type MessageField = {kind:'text';name:string;label:string;value:string;maxLength:number} | {kind:'select';name:string;label:string;value:string;disabled?:boolean;options:Array<{value:string;label:string;disabled?:boolean}>};
export type MessagePage = {
  title: string;
  heading: string;
  text?: string;
  form?: { action: string; button: string; fields?:MessageField[]; secondaryButton?:{name:string;value:string;label:string} };
  links?: { href: string; label: string }[];
  mark?: 'stamp' | 'posted';
};

const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value: string) => value.replace(/[&<>"']/g, (character) => escapes[character]);

const mark = (className: string) => `<svg class="${className}" viewBox="${markViewBox}" aria-hidden="true" focusable="false">`
  + markShapes.map(({ d, fill }) => `<path d="${d}" fill="${fill}"/>`).join('') + '</svg>';

const stamp = '<div class="stamp" aria-hidden="true"><div class="stamp-sheet"><div class="stamp-print">'
  + mark('stamp-fruit') + '</div></div></div>';

/** The ring with YES round its top, a tick inside and three dots below, trailing wavy lines (as Postmark draws a rim word). */
const posted = (() => {
  const letters = [...'YES'].map((letter, index) => `<text x="30" y="11.7" text-anchor="middle" transform="rotate(${(index - 1) * 22.5} 30 30)">${letter}</text>`);
  const dots = [155, 180, 205].map((angle) => `<circle class="postmark-dot" cx="30" cy="8.4" r="1.15" transform="rotate(${angle} 30 30)"/>`);
  return '<div class="postmark" aria-hidden="true"><svg class="postmark-ring" viewBox="0 0 60 60" focusable="false">'
    + '<circle cx="30" cy="30" r="28"/><circle cx="30" cy="30" r="14.4" class="postmark-inner"/>'
    + `<g class="postmark-rim">${letters.join('')}<path class="postmark-tick" d="M24 30.4 27.9 34.2 36 25.8"/>${dots.join('')}</g></svg>`
    + '<svg class="waves" viewBox="0 0 70 34" preserveAspectRatio="none" focusable="false"><path d="M1 4C7 1 11 7 17 4S27 1 33 4 43 7 49 4 59 1 69 4M1 13C7 10 11 16 17 13S27 10 33 13 43 16 49 13 59 10 69 13M1 22C7 19 11 25 17 22S27 19 33 22 43 25 49 22 59 19 69 22M1 31C7 28 11 34 17 31S27 28 33 31 43 34 49 31 59 28 69 31"/></svg></div>';
})();

/** The card's pencil outline: a firm pass and a fainter second one, as Paper draws it. */
const pencil = (w: number, h: number, seed: number) => `<svg class="paper-pencil" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false">`
  + `<path d="${pencilPath(w, h, seed)}"/><path class="paper-pencil-ghost" d="${pencilPath(w, h, seed + 17)}"/></svg>`;

function fieldMarkup(field:MessageField,index:number) {
  const id='preference-field-'+index;
  const control=field.kind==='text'?`<input id="${id}" name="${escape(field.name)}" value="${escape(field.value)}" maxlength="${field.maxLength}">`:`<select id="${id}" name="${escape(field.name)}"${field.disabled?' disabled':''}>${field.options.map(option=>`<option value="${escape(option.value)}"${option.value===field.value?' selected':''}${option.disabled?' disabled':''}>${escape(option.label)}</option>`).join('')}</select>`;
  return `<label for="${id}">${escape(field.label)}${control}</label>`;
}
function body({ heading, text, form, links, mark: drawn }: Omit<MessagePage, 'title'>) {
  const face = (drawn ? stamp : '') + (drawn === 'posted' ? posted : '')
    + `<h1>${escape(heading)}</h1>`
    + (text ? `<p>${escape(text)}</p>` : '')
    + (links?.length ? `<p class="links">${links.map(({ href, label }) => `<a href="${escape(href)}">${escape(label)}</a>`).join('')}</p>` : '')
    + (form ? `<form method="post" action="${escape(form.action)}">${form.fields?`<div class="message-fields">${form.fields.map(fieldMarkup).join('')}</div>`:''}<button type="submit" name="confirm" value="true">${escape(form.button)}</button>${form.secondaryButton?`<button class="message-secondary" type="submit" name="${escape(form.secondaryButton.name)}" value="${escape(form.secondaryButton.value)}">${escape(form.secondaryButton.label)}</button>`:''}</form>` : '');
  return `<header class="head"><span class="brand">${mark('brand-mark')}${escape(productConfig.productName)}</span></header>`
    + `<main><div class="paper"><div class="paper-face">${face}</div>${pencil(480, 300, 59)}</div></main>`;
}

let styleHash: Promise<string> | undefined;
/** The stylesheet's CSP hash, computed once, on the first page served. */
function hashStyles() {
  styleHash ??= crypto.subtle.digest('SHA-256', new TextEncoder().encode(messageStyles))
    .then((digest) => btoa(String.fromCharCode(...new Uint8Array(digest))));
  return styleHash;
}

/** The page's HTML and the headers that go with it: its one inline stylesheet is allowed by hash, and the only other
 * loads are the site's own font stylesheet and files (same origin), declared in the head as the root route does. */
export async function renderMessagePage({ title, ...card }: MessagePage) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>${fontHead}<style>${messageStyles}</style></head><body>${body(card)}</body></html>`;
  const policy = `default-src 'none'; style-src 'self' 'sha256-${await hashStyles()}'; font-src 'self'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`;
  return { html, headers: { 'Content-Security-Policy': policy } };
}
