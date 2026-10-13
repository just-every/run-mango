// Buyer-owned configuration. Example: set organizationName to your store name
// and landingSummary to the one line you want visitors to read in the landing page footer.
import type { ProductConfig } from '@/core/shared/product-config';

export const productConfig = {
  storeTimezone: 'Australia/Brisbane',
  productName: 'Mango',
  organizationName: 'Your store',
  landingSummary: 'Letters worth opening, sent only to readers who asked for them.',
  showPoweredByCredit: true,
} satisfies ProductConfig;
