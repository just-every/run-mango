// Bounds for reading one account export inside a single Worker request (128 MB isolate).
// The measurements behind these values are in docs/moving-in.md#limits-for-a-full-export.
export const archiveLimits = {
  /** The uploaded archive itself; it is held in memory and kept as base64 import custody. */
  archiveBytes: 16 * 1024 * 1024,
  /** Central-directory entries, folders included. */
  entries: 5_000,
  /** One expanded entry. Entries stream through hashing; only text kept for review is held. */
  entryBytes: 64 * 1024 * 1024,
  /** Every expanded entry together: bounds inflate work for the request. */
  expandedBytes: 160 * 1024 * 1024,
  /** Expanded text kept for review (audience CSVs, emails CSV, content and templates). */
  retainedTextBytes: 12 * 1024 * 1024,
  /** Audience rows reviewed from one archive: the contact review holds every row's snapshot. */
  audienceRows: 5_000,
  /** Expanded to compressed size, checked for entries over ratioFloorBytes. */
  compressionRatio: 100,
  ratioFloorBytes: 1024 * 1024,
} as const;

export const custodyChunkBytes = 750_000;
