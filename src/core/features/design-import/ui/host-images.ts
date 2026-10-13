import { CampaignImageUploadError, uploadCampaignImage } from '@/core/features/campaign-assets/ui/upload';
import { DesignImportError } from '../layerdoc';
import type { DesignPlan } from '../plan';
import type { HostedImage } from '../compile';

/** Browser half of design import (DESIGN-004): photos are cut from the full-resolution candidate PNG on a
 * canvas, encoded as JPEG and uploaded through the campaign image door (CAMP-012), which re-checks every
 * file. No image codec runs in the Worker, and nothing is fetched from the design service. */
export type UploadedImage = HostedImage & { alt: string; bytes: number; width: number; height: number };
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const maxCandidateBytes = 40 * 1024 * 1024;
/** Pixels per displayed pixel: sharp on high-density screens without growing the email's weight much. */
const density = 2;

export async function readCandidate(file: Blob, canvas: DesignPlan['canvas']) {
  if (file.size > maxCandidateBytes) throw new DesignImportError('invalid_image', 'The design image is larger than 40 MB.');
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (pngSignature.some((byte, index) => head[index] !== byte)) throw new DesignImportError('invalid_image', 'The design image must be the PNG candidate that 12ui drafted.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new DesignImportError('invalid_image', 'The design image could not be read as a PNG.'); }
  const {width, height} = bitmap;
  if (Math.abs(width / height - canvas.width / canvas.height) > 0.01) {
    bitmap.close();
    throw new DesignImportError('invalid_image', `The design image is ${width}×${height}, but the LayerDoc describes a ${canvas.width}×${canvas.height} design. Choose the PNG this LayerDoc was converted from.`);
  }
  return bitmap;
}

async function crop(bitmap: ImageBitmap, plan: DesignPlan, image: DesignPlan['images'][number]) {
  const scale = bitmap.width / plan.canvas.width;
  const left = Math.max(0, Math.round(image.crop[0] * scale)), top = Math.max(0, Math.round(image.crop[1] * scale));
  const width = Math.min(bitmap.width - left, Math.round(image.crop[2] * scale)), height = Math.min(bitmap.height - top, Math.round(image.crop[3] * scale));
  if (width < 2 || height < 2) throw new DesignImportError('invalid_image', `The image "${image.alt}" lies outside the design image.`);
  const pixelWidth = Math.min(width, image.width * density), pixelHeight = Math.max(2, Math.round(height * pixelWidth / width));
  const canvas = document.createElement('canvas');
  canvas.width = pixelWidth; canvas.height = pixelHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new DesignImportError('invalid_image', 'This browser cannot draw the design image.');
  // JPEG has no transparency: a cut-out logo sits on the email's own background.
  context.fillStyle = plan.background;
  context.fillRect(0, 0, pixelWidth, pixelHeight);
  context.drawImage(bitmap, left, top, width, height, 0, 0, pixelWidth, pixelHeight);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) throw new DesignImportError('invalid_image', `The image "${image.alt}" could not be encoded.`);
  return blob;
}

/** Crops, encodes and uploads every image the plan asks for, in order. */
export async function hostImages(plan: DesignPlan, bitmap: ImageBitmap, progress: (done: number, total: number) => void) {
  const hosted = new Map<string, UploadedImage>();
  for (const [index, image] of plan.images.entries()) {
    progress(index, plan.images.length);
    const blob = await crop(bitmap, plan, image);
    let asset;
    try { asset = await uploadCampaignImage(blob, `${image.id}.jpg`, 'design-import'); }
    catch (problem) { throw new DesignImportError('upload_failed', problem instanceof CampaignImageUploadError ? problem.message : `Mango did not store the image "${image.alt}".`); }
    hosted.set(image.id, { url: asset.url, alt: image.alt, bytes: asset.bytes, width: asset.width, height: asset.height });
  }
  progress(plan.images.length, plan.images.length);
  return hosted;
}
