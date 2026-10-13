import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { inspectEmailHtml } from '../src/core/features/campaigns/email-html-policy';
import { compileDesignEmail } from '../src/core/features/design-import/compile';
import { DesignImportError, parseLayerDoc, type LayerNode } from '../src/core/features/design-import/layerdoc';
import { planDesign } from '../src/core/features/design-import/plan';

// The real 12ui orchard LayerDoc (signed artifact links redacted); the compiler is pure, so it runs here without a browser.
const fixture = readFileSync(new URL('./campaign-authoring/fixtures/orchard.layerdoc.json', import.meta.url), 'utf8');
const destination = 'https://shop.example.test/season';
type Mutate = (nodes: LayerNode[]) => void;
const each = (nodes: LayerNode[], visit: (node: LayerNode) => void) => { for (const node of nodes) { visit(node); each(node.children ?? [], visit); } };
const kind = (name: string, change: (node: LayerNode) => void): Mutate => nodes => each(nodes, node => { if (node.kind === name) change(node); });

function compile(text: string) {
  const plan = planDesign(parseLayerDoc(text));
  const hosted = new Map(plan.images.map((image, index) => [image.id, { url: `https://mango.example.test/media/${String(index).padStart(64, 'a')}` }]));
  return compileDesignEmail(plan, hosted, plan.buttonLabel ? destination : undefined);
}
function variant(mutate: Mutate) {
  const doc = JSON.parse(fixture) as { layers: LayerNode[] };
  mutate(doc.layers);
  return JSON.stringify(doc);
}

// Hostile LayerDoc values: each is refused with a named import error, or compiles into a body the shared
// approval checker accepts with the hostile value escaped or gone.
const hostile: Array<[string, Mutate, RegExp]> = [
  ['markup in heading text', kind('heading', node => { node.content = '<img src=x onerror=alert(1)><script>alert(1)</script>'; }), /<img src=x|<script/],
  ['a closing tag and attribute in paragraph text', kind('paragraph', node => { node.content = '"></p><a href="javascript:alert(1)">win</a>'; }), /<a href="javascript/],
  ['CSS declarations in a text colour', kind('heading', node => { node.color = '#000;background-image:url(https://evil.example/x)'; }), /url\(|evil\.example/],
  ['a function in a button fill', kind('button', node => { node.style = { ...node.style, background: 'url(https://evil.example/x)' }; }), /url\(|evil\.example/],
  ['declarations in a font name', kind('heading', node => { node.googleFontFamily = 'Lora;display:none'; }), /display:none/],
  ['a page background with CSS', kind('background', node => { node.style = { background: 'red;position:absolute' }; }), /position|red;/],
  ['a radius with CSS', kind('photo', node => { node.style = { borderRadius: '8px;opacity:0' }; }), /opacity/],
  ['letter spacing with CSS', kind('text', node => { node.style = { letterSpacing: '1px;font-size:0' }; }), /font-size:0/],
  ['a managed token in design text', kind('paragraph', node => { node.content = 'Reply to {{unsubscribe_url}}'; }), /Reply to \{\{/],
  ['a personalisation token in design text', kind('heading', node => { node.content = 'Hi {{first_name}}'; }), /\{\{first_name/],
  ['an unknown LayerDoc version', () => undefined, /./],
];

test('[DESIGN-004] the orchard LayerDoc compiles inside the shared checker, and hostile LayerDoc values never reach the email', () => {
  const html = compile(fixture);
  expect(inspectEmailHtml(html).issues).toEqual([]);
  expect(html.match(/\{\{unsubscribe_url\}\}/g)).toHaveLength(1);
  expect(html.match(/\{\{physical_address\}\}/g)).toHaveLength(1);
  expect(html).not.toMatch(/123 Orchard Lane|12ui\.com/);
  expect(html).toContain(`href="${destination}"`);

  for (const [name, mutate, injected] of hostile) {
    const text = name === 'an unknown LayerDoc version' ? fixture.replace('"version": "2"', '"version": "3"') : variant(mutate);
    let output: string | undefined;
    try { output = compile(text); } catch (error) {
      expect(error, name).toBeInstanceOf(DesignImportError);
      continue;
    }
    expect(name === 'an unknown LayerDoc version', `${name} must be refused`).toBe(false);
    expect(inspectEmailHtml(output).issues, name).toEqual([]);
    expect(output, name).not.toMatch(injected);
  }
  expect(() => compileDesignEmail(planDesign(parseLayerDoc(fixture)), new Map(), destination)).toThrow(DesignImportError);
  const plan = planDesign(parseLayerDoc(fixture));
  const hosted = new Map(plan.images.map(image => [image.id, { url: 'https://mango.example.test/media/x' }]));
  expect(() => compileDesignEmail(plan, hosted, 'javascript:alert(1)')).toThrow(DesignImportError);
});

test('[DESIGN-004] a LayerDoc nested too deep or with too many layers is refused by name, never a stack overflow', () => {
  const nested = (depth: number) => {
    let layers = '[]';
    for (let level = 0; level < depth; level++) layers = `[{"kind":"group","box":[0,0,10,10],"children":${layers}}]`;
    return `{"version":"2","canvas":{"width":600,"height":900},"layers":${layers}}`;
  };
  const wide = `{"version":"2","canvas":{"width":600,"height":900},"layers":[{"kind":"group","box":[0,0,10,10],"children":[${Array(2_500).fill('{"kind":"text","box":[0,0,1,1]}').join(',')}]}]}`;
  for (const [name, text] of [['1,500 levels', nested(1_500)], ['100,000 levels', nested(100_000)], ['2,500 layers', wide]]) {
    let error: unknown;
    try { parseLayerDoc(text); } catch (failure) { error = failure; }
    expect(error, name).toBeInstanceOf(DesignImportError);
    expect((error as DesignImportError).code, name).toBe('invalid_layout');
  }
  expect(parseLayerDoc(nested(3)).layers).toHaveLength(1);
});
