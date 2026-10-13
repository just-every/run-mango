import { z } from 'zod';

/** The subset of 12ui's public LayerDoc v2 that Mango's design import reads (DESIGN-004).
 * Every other field (signed artifact URLs, extraction metadata, icon SVG) is ignored and never fetched. */
export type LayerNode = {
  kind: string;
  name?: string;
  content?: string;
  box: [number, number, number, number];
  color?: string;
  fontSizePx?: number;
  fontWeight?: number | string;
  googleFontFamily?: string;
  align?: string;
  surface?: string;
  style?: Record<string, unknown>;
  children?: LayerNode[];
};
export type LayerDoc = { version: string; canvas: { width: number; height: number }; layers: LayerNode[] };

const maxNodes = 2_000;
/** Deepest layer nesting read; 12ui's layer groups nest a few levels. */
const maxDepth = 64;
const finite = z.number().finite();
const node: z.ZodType<LayerNode> = z.lazy(() => z.object({
  kind: z.string().min(1).max(40),
  name: z.string().max(200).optional(),
  content: z.string().max(4_000).optional(),
  box: z.tuple([finite, finite, finite.nonnegative(), finite.nonnegative()]),
  color: z.string().max(200).optional(),
  fontSizePx: finite.positive().max(1_000).optional(),
  fontWeight: z.union([finite, z.string().max(20)]).optional(),
  googleFontFamily: z.string().max(200).optional(),
  align: z.string().max(20).optional(),
  surface: z.string().max(20).optional(),
  style: z.record(z.string(), z.unknown()).optional(),
  children: z.array(node).max(maxNodes).optional(),
}));
const document = z.object({
  version: z.literal('2'),
  canvas: z.object({ width: finite.positive().max(20_000), height: finite.positive().max(40_000) }),
  layers: z.array(node).min(1).max(maxNodes),
});

export class DesignImportError extends Error {
  constructor(readonly code: 'invalid_layout' | 'unsupported_design' | 'invalid_image' | 'upload_failed', message: string) { super(message); }
}

/** Counts layers and their nesting with an explicit stack before the recursive schema reads them, so an oversized or
 * deeply nested file is refused by name after bounded work instead of overflowing the stack. Shapes are the schema's. */
function checkLayerTree(json: unknown) {
  const layers = (json as { layers?: unknown }).layers;
  const pending: Array<[unknown[], number]> = Array.isArray(layers) ? [[layers, 1]] : [];
  let total = 0;
  for (let next = pending.pop(); next; next = pending.pop()) {
    const [nodes, depth] = next;
    if (depth > maxDepth) throw new DesignImportError('invalid_layout', `The LayerDoc nests layers more than ${maxDepth} deep.`);
    total += nodes.length;
    if (total > maxNodes) throw new DesignImportError('invalid_layout', `The LayerDoc has more than ${maxNodes} layers.`);
    for (const item of nodes) {
      const children = (item as { children?: unknown } | null)?.children;
      if (Array.isArray(children) && children.length) pending.push([children, depth + 1]);
    }
  }
}

/** Parses a LayerDoc file's text. Only version "2" is read; anything else is refused, never guessed. */
export function parseLayerDoc(text: string): LayerDoc {
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new DesignImportError('invalid_layout', 'The LayerDoc file is not JSON.'); }
  const version = (json as { version?: unknown } | null)?.version;
  if (version !== '2') throw new DesignImportError('invalid_layout', `This LayerDoc version (${JSON.stringify(version ?? null).slice(0, 20)}) is not supported. Mango reads LayerDoc version 2 from 12ui convert --output layerdoc.`);
  checkLayerTree(json);
  const parsed = document.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DesignImportError('invalid_layout', `The LayerDoc does not have the expected shape at ${issue.path.join('.') || 'its top level'}: ${issue.message}`);
  }
  return parsed.data;
}
