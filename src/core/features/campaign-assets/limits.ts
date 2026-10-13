/** Campaign image limits, as declared in seed.json → limits (CAMP-012). */
export const campaignAssetLimits = {
  /** seed.json maxCampaignAssetBytes */
  maxBytes: 10_485_760,
  /** seed.json maxCampaignAssetPixelsPerSide */
  maxPixelsPerSide: 4096,
  /** seed.json allowedCampaignAssetContentTypes */
  contentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as readonly string[],
  /** seed.json mediaRequestsPerMinutePerAsset: twice the declared email hand-off rate, so the
   * mailbox image proxies fetching one send's images are never throttled. */
  mediaRequestsPerMinutePerAsset: 6000,
} as const;

/** R2 key of an image's bytes. The SHA-256 is the only name; it carries no contact data. */
export const campaignAssetKey = (sha256: string) => `campaign-assets/${sha256}`;
export const mediaPath = (sha256: string) => `/media/${sha256}`;
const extensions: Record<string, string[]> = { png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], gif: ['image/gif'], webp: ['image/webp'] };
/** The last path segment of a media URL: `<sha256>` or `<sha256>.<ext>` with a lower-case image extension.
 * The extension is optional and decorative; when present it must name the stored type. */
export function parseMediaName(name: string) {
  const match = /^([0-9a-f]{64})(?:\.([a-z]{3,4}))?$/.exec(name);
  if (!match || (match[2] && !Object.hasOwn(extensions, match[2]))) return undefined;
  return { sha256: match[1], matches: (contentType: string) => !match[2] || extensions[match[2]].includes(contentType) };
}
