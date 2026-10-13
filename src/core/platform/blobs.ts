import type { BlobStore } from '@/core/shared/platform';

export function createBlobStore(bucket: R2Bucket): BlobStore {
  return {
    head: (key) => bucket.head(key),
    get: (key, options) => bucket.get(key, options),
    put: (key, value, options) => bucket.put(key, value, options),
    delete: (key) => bucket.delete(key),
    list: (options) => bucket.list(options),
  };
}
