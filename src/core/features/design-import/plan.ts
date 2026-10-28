import { DesignImportError, type LayerDoc, type LayerNode } from './layerdoc';
import { fontStack, hexColour, readable } from './palette';
import { emailColumnPixels } from '../campaigns/email-limits';

/** How a LayerDoc becomes rows of a 600px email (DESIGN-012). Pure: the browser crops the images this
 * plan asks for, and compile.ts writes the HTML. */
export const emailWidth = emailColumnPixels, gutter = 20, innerWidth = emailWidth - gutter * 2, columnGap = 20;
export const columnWidth = (innerWidth - columnGap) / 2;

export type TextBlock = { tag: 'h1' | 'h2' | 'p'; text: string; colour: string; font: string; size: number; bold: boolean; align: 'left' | 'center' | 'right'; spacing?: number; lineHeight: number; margin: string };
export type ImageBlock = { id: string; alt: string; crop: [number, number, number, number]; width: number; height: number; radius: number; inline: boolean };
export type Row =
  | { kind: 'stack'; items: Array<TextBlock | ImageBlock> }
  | { kind: 'columns'; photo: ImageBlock; side: 'left' | 'right'; words: TextBlock[] }
  | { kind: 'button'; words: TextBlock[]; label: string; fill: string; ink: string; radius: number; font: string }
  | { kind: 'rule'; colour: string }
  | { kind: 'footer'; notes: TextBlock[]; linkColour: string; font: string; muted: string };
export type DroppedLayer = { kind: string; text: string; reason: string };
export type DesignPlan = { canvas: LayerDoc['canvas']; background: string; rows: Row[]; images: ImageBlock[]; dropped: DroppedLayer[]; lines: string[]; buttonLabel?: string; adjustments: string[] };

const imageKinds = new Set(['photo', 'image', 'illustration']);
const textKinds = new Set(['text', 'heading', 'paragraph']);
const decorative = new Set(['icon', 'divider', 'shape', 'background']);
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, Math.round(value)));
// A raster logo is an emblem to crop; a vector logo is lettering.
const isImage = (node: LayerNode) => imageKinds.has(node.kind) || (node.kind === 'logo' && node.surface === 'raster');
const leaves = (nodes: LayerNode[]): LayerNode[] => nodes.flatMap(node => node.kind === 'group' ? leaves(node.children ?? []) : [node]);
const byPosition = (a: LayerNode, b: LayerNode) => a.box[1] - b.box[1] || a.box[0] - b.box[0];
const words = (node: LayerNode) => (node.content ?? '').trim();
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();
const alignOf = (value: unknown): TextBlock['align'] => value === 'center' || value === 'right' ? value : 'left';
const pixels = (value: unknown) => { const number = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN; return Number.isFinite(number) ? number : 0; };

export function planDesign(doc: LayerDoc): DesignPlan {
  const dropped: DroppedLayer[] = [], adjustments: string[] = [], lines: string[] = [], images: ImageBlock[] = [];
  const drop = (node: LayerNode, reason: string) => dropped.push({ kind: node.kind, text: oneLine(node.content ?? '') || `(${node.kind} without text)`, reason });
  for (const node of leaves(doc.layers)) if (/\{\{|\}\}/.test(node.content ?? '')) throw new DesignImportError('unsupported_design', 'Design text contains "{{" or "}}", which Mango reserves for personalisation. Edit the LayerDoc text first.');

  const groups = doc.layers.map(layer => ({ name: layer.kind === 'group' ? (layer.name ?? '').toLowerCase() : '', nodes: layer.kind === 'group' ? leaves(layer.children ?? []) : [layer] }));
  const grounds = groups.flatMap(group => group.nodes).filter(node => node.kind === 'background');
  const declaredGround = grounds[0]?.style?.background;
  const background = hexColour(declaredGround) ?? '#ffffff';
  if (declaredGround !== undefined && !hexColour(declaredGround)) adjustments.push('The page background is not a hex colour, so the email uses white.');
  const ordered = groups.map(group => ({ ...group, nodes: group.nodes.filter(node => node.kind !== 'background') })).filter(group => group.nodes.length)
    .sort((a, b) => Math.min(...a.nodes.map(node => node.box[1])) - Math.min(...b.nodes.map(node => node.box[1])));
  const isFooter = (group: { name: string; nodes: LayerNode[] }) => group.name === 'footer' || group.nodes.some(node => node.kind === 'link' && /unsubscribe/i.test(node.content ?? ''));
  const content = ordered.filter(group => group.name !== 'header' && !isFooter(group)).flatMap(group => group.nodes).filter(node => isImage(node) || textKinds.has(node.kind) || node.kind === 'button');
  const x0 = content.length ? Math.min(...content.map(node => node.box[0])) : 0;
  const x1 = content.length ? Math.max(...content.map(node => node.box[0] + node.box[2])) : doc.canvas.width;
  const scale = innerWidth / Math.max(1, x1 - x0);
  const largest = Math.max(0, ...content.filter(node => node.kind === 'heading').map(node => node.fontSizePx ?? 0));

  const colour = (node: LayerNode, ground: string, fallback: string) => {
    const declared = hexColour(node.color);
    if (node.color !== undefined && !declared) adjustments.push(`"${oneLine(node.content ?? node.kind).slice(0, 60)}" has a colour that is not hex, so it uses a default.`);
    const chosen = readable(declared ?? fallback, ground);
    if (declared && chosen !== declared) adjustments.push(`"${oneLine(node.content ?? node.kind).slice(0, 60)}" uses ${chosen} instead of ${declared}, so it reads at 4.5:1.`);
    return chosen;
  };
  const text = (node: LayerNode, centred = false): TextBlock => {
    const value = words(node), size = (node.fontSizePx ?? 16) * scale, align = centred ? 'center' : alignOf(node.align);
    const base = { colour: colour(node, background, '#222222'), font: fontStack(node.googleFontFamily), align, bold: pixels(node.fontWeight) >= 600 || node.fontWeight === 'bold' };
    lines.push(oneLine(value));
    if (node.kind === 'heading') {
      const first = (node.fontSizePx ?? 0) >= largest;
      return { ...base, tag: first ? 'h1' : 'h2', text: value, size: first ? clamp(size, 28, 40) : clamp(size, 20, 28), lineHeight: 1.2, margin: '0 0 12px' };
    }
    if (node.kind === 'logo') return { ...base, tag: 'p', text: value, size: clamp(size, 18, 24), lineHeight: 1.3, margin: '8px 0 0', spacing: 3 };
    if (node.kind === 'text' && size < 15) return { ...base, tag: 'p', text: oneLine(value), size: 12, bold: true, lineHeight: 1.4, margin: '0 0 8px', spacing: Math.min(4, Math.round(pixels(node.style?.letterSpacing) * scale * 10) / 10) || undefined };
    return { ...base, tag: 'p', text: oneLine(value), size: 16, lineHeight: 1.6, margin: '0 0 16px' };
  };
  const image = (node: LayerNode, width: number, inline = false): ImageBlock => {
    const [x, y, w, h] = node.box, displayWidth = clamp(Math.min(width, innerWidth), 2, innerWidth);
    const block = { id: `image-${images.length + 1}`, alt: oneLine(node.content ?? '').slice(0, 200), crop: [x, y, w, h] as ImageBlock['crop'], width: displayWidth,
      height: clamp(h * displayWidth / Math.max(1, w), 2, 2_000), radius: clamp(pixels(node.style?.borderRadius), 0, 40), inline };
    if (w < 2 || h < 2) throw new DesignImportError('invalid_layout', `The image layer "${block.alt}" has no area to crop.`);
    images.push(block);
    return block;
  };

  const rows: Row[] = [];
  let buttonLabel: string | undefined, footer: Row[] | undefined;
  for (const group of ordered) {
    const nodes = [...group.nodes].sort(byPosition);
    if (isFooter(group)) { footer = footerRow(nodes); continue; }
    const items: Array<TextBlock | ImageBlock> = [], photos = nodes.filter(isImage), copy: TextBlock[] = [];
    const button = nodes.find(node => node.kind === 'button' && words(node));
    for (const node of nodes) {
      if (node === button) continue;
      if (isImage(node)) continue;
      if (textKinds.has(node.kind) || (node.kind === 'logo' && words(node))) { if (words(node)) copy.push(text(node, group.name === 'header')); else drop(node, 'no text'); continue; }
      if (node.kind === 'button') drop(node, buttonLabel || button ? 'Mango asks for one button destination; this button is left out' : 'button without a label');
      else if (node.kind === 'link') drop(node, 'a link with no destination in the LayerDoc');
      else drop(node, decorative.has(node.kind) ? 'decorative' : 'layer kind Mango does not import');
    }
    if (button) {
      buttonLabel = oneLine(words(button)); lines.push(buttonLabel);
      const declaredFill = hexColour(button.style?.background);
      if (!declaredFill) adjustments.push('The button fill is not a hex colour, so it uses #222222.');
      const fill = declaredFill ?? '#222222';
      for (const node of photos) items.push(image(node, group.name === 'header' ? node.box[2] * scale : innerWidth));
      rows.push({ kind: 'button', words: [...copy], label: buttonLabel, fill, ink: readable(hexColour(button.color) ?? '#ffffff', fill), radius: clamp(pixels(button.style?.borderRadius), 0, 40), font: fontStack(button.googleFontFamily) });
      if (items.length) rows.push({ kind: 'stack', items });
      continue;
    }
    const photo = photos.length === 1 ? photos[0] : undefined;
    // Two columns on any page colour: the copy cannot leave its column's cell (MSG-012), so it is read on the page colour only.
    const besideText = photo && copy.length && photo.box[2] < 0.9 * (x1 - x0);
    if (photo && besideText && group.name !== 'header') {
      const textLeft = Math.min(...nodes.filter(node => !isImage(node) && words(node)).map(node => node.box[0]));
      rows.push({ kind: 'columns', photo: image(photo, columnWidth), side: photo.box[0] < textLeft ? 'left' : 'right', words: copy });
      continue;
    }
    // Everything else stacks in reading order, images at full width (or their own width in the header).
    let next = 0;
    for (const node of nodes) {
      if (isImage(node)) items.push(image(node, group.name === 'header' ? node.box[2] * scale : innerWidth, group.name === 'header'));
      else if ((textKinds.has(node.kind) || node.kind === 'logo') && words(node) && node !== button) items.push(copy[next++]);
    }
    if (items.length) rows.push({ kind: 'stack', items });
  }
  rows.push(...footer ?? footerRow([]));
  return { canvas: doc.canvas, background, rows, images, dropped, lines: lines.filter(Boolean), buttonLabel, adjustments };

  /** The design's footer becomes Mango's compliance footer in the design's colours: its note, the managed
   * unsubscribe link and the saved postal address, never an address the design invented. */
  function footerRow(nodes: LayerNode[]): Row[] {
    const notes: TextBlock[] = [];
    const link = nodes.find(node => node.kind === 'link');
    let muted: string | undefined;
    for (const node of nodes) {
      if (node.kind === 'link') { drop(node, "replaced by Mango's managed unsubscribe link"); continue; }
      if (textKinds.has(node.kind) && /\d/.test(words(node))) { drop(node, 'replaced by your saved postal address'); continue; }
      if (textKinds.has(node.kind) && words(node)) { const note = text(node, true); notes.push({ ...note, size: 12, bold: false, lineHeight: 1.5, margin: '0 0 8px', spacing: undefined }); muted ??= note.colour; continue; }
      drop(node, node.kind === 'divider' ? 'decorative (the footer keeps one rule)' : decorative.has(node.kind) || isImage(node) ? 'decorative' : 'layer kind Mango does not import');
    }
    const rule = hexColour(nodes.find(node => node.kind === 'divider')?.style?.background);
    const font = fontStack(link?.googleFontFamily ?? nodes.find(node => textKinds.has(node.kind))?.googleFontFamily);
    const row: Row = { kind: 'footer', notes, font, muted: muted ?? readable('#666666', background), linkColour: link ? colour(link, background, '#333333') : readable('#333333', background) };
    return rule ? [{ kind: 'rule', colour: rule }, row] : [row];
  }
}
