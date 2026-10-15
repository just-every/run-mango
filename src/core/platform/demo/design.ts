import type { AppBindings, DesignProvider } from '@/core/shared/platform';
import { demoResult } from './effect';

const document = JSON.stringify({ version: '2', canvas: { width: 600, height: 760 }, layers: [
  { kind: 'shape', box: [0, 0, 600, 760], color: '#fffaf0' },
  { kind: 'text', content: 'MANGO SAMPLE STORE', box: [48, 48, 504, 32], fontSizePx: 18, color: '#304735' },
  { kind: 'text', content: 'A little inspiration\nfor your weekend', box: [48, 140, 504, 144], fontSizePx: 48, fontWeight: 600, color: '#263d2c' },
  { kind: 'text', content: 'Meet our latest collection and the people behind it. Thank you for being part of our community.', box: [48, 330, 504, 160], fontSizePx: 24, color: '#263d2c' },
  { kind: 'text', content: 'Explore the collection', box: [48, 570, 504, 48], fontSizePx: 24, fontWeight: 600, color: '#263d2c' },
] });

/** Mock the paid design operation and its resulting private account artifacts. */
export function demoDesign(real: DesignProvider, env: AppBindings): DesignProvider {
  return { provider: real.provider,
    startDraft: (input, key) => demoResult(() => real.startDraft(input, key), () => ({ runId: `demo-${input.slots.join('-')}`, candidates: input.slots.map(slot => ({ slot, status: 'succeeded' as const })) })),
    dispatchCandidate: (...args) => demoResult(() => real.dispatchCandidate(...args), () => 'dispatched' as const),
    readDraft: id => demoResult(() => real.readDraft(id), () => ({ runId: id, candidates: id.slice(5).split('-').map(slot => ({ slot, status: 'succeeded' as const })) })),
    candidateImage: (...args) => demoResult(() => real.candidateImage(...args), async () => {
      const response = await env.ASSETS.fetch(new Request(new URL('/demo/design.png', env.RER_DEV_ORIGIN || env.MANGO_PUBLIC_BASE_URL || env.AUTH_ORIGIN)));
      if (!response.ok) throw new Error('Demo design sample is missing.');
      return new Uint8Array(await response.arrayBuffer());
    }),
    startLayout: (...args) => demoResult(() => real.startLayout(...args), () => ({ layoutId: 'demo-layout', status: 'succeeded' as const })),
    readLayout: id => demoResult(() => real.readLayout(id), () => ({ layoutId: id, status: 'succeeded' as const })),
    layoutDocument: layout => demoResult(() => real.layoutDocument(layout), () => document),
  };
}
