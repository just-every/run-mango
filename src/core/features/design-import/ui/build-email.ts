import { safeEmailUrl } from '@/core/features/campaigns/email-html-policy';
import { linesNotInBrief } from '../brief';
import { compileDesignEmail } from '../compile';
import { DesignImportError, parseLayerDoc } from '../layerdoc';
import { planDesign, type DesignPlan } from '../plan';
import { hostImages, readCandidate } from './host-images';
import type { ImportSummary } from './import-summary';

/** The one browser path from a LayerDoc and its candidate PNG to an email body (DESIGN-004), shared by Import 12ui
 * design and Design with 12ui (DESIGN-002). It never saves: the caller hands the result to the editor. */
export type PendingDesign = { plan: DesignPlan; bitmap: ImageBitmap; href?: string; brief: string };

export const designFailure = (error: unknown) => error instanceof DesignImportError ? error.message : 'The design could not be imported.';

/** Reads and plans the design and checks the button destination; nothing is uploaded yet. */
export async function prepareDesign(input: { layerDocText: string; candidate: Blob; destination: string; brief: string }): Promise<PendingDesign> {
  const plan = planDesign(parseLayerDoc(input.layerDocText));
  const href = input.destination.trim();
  if (plan.buttonLabel && !safeEmailUrl(href)) throw new DesignImportError('invalid_layout', `The design's button “${plan.buttonLabel}” needs an HTTPS destination.`);
  return { plan, bitmap: await readCandidate(input.candidate, plan.canvas), href: plan.buttonLabel ? href : undefined, brief: input.brief };
}

/** Crops and uploads the photos, compiles the email and describes what changed. */
export async function buildDesignEmail(design: PendingDesign, mediaOrigin: string, progress: (text: string) => void): Promise<{ html: string; summary: ImportSummary }> {
  const hosted = await hostImages(design.plan, design.bitmap, (done, total) => progress(total ? `Uploading images: ${done} of ${total}` : 'Building the email'));
  const html = compileDesignEmail(design.plan, hosted, design.href, mediaOrigin);
  return { html, summary: {
    unreviewed: linesNotInBrief(design.plan.lines, design.brief),
    images: [...hosted.values()].map(image => ({ ...image, altNotInBrief: linesNotInBrief([image.alt], design.brief).length > 0 })),
    dropped: design.plan.dropped, adjustments: design.plan.adjustments,
    button: design.plan.buttonLabel && design.href ? { label: design.plan.buttonLabel, href: design.href } : undefined,
  } };
}
