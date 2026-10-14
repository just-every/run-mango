export const pageInfo = 'pageInfo { hasNextPage endCursor }';
const bag = '{ shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }';
export const customerFields = `id createdAt updatedAt email phone firstName lastName defaultAddress { city provinceCode countryCodeV2 zip } emailMarketingConsent { marketingState marketingOptInLevel consentUpdatedAt } smsMarketingConsent { marketingState marketingOptInLevel consentUpdatedAt }`;
export const lineFields = `id quantity currentQuantity product { id } variant { id } originalTotalSet ${bag} discountedTotalSet ${bag}`;
export const refundLineFields = `quantity restockType lineItem { ${lineFields} } subtotalSet ${bag} totalTaxSet ${bag}`;
export const transactionFields = `id kind status test createdAt processedAt amountSet ${bag}`;
export const returnLineFields = `__typename id quantity ... on ReturnLineItem { refundedQuantity refundableQuantity fulfillmentLineItem { lineItem { ${lineFields} } } }`;
export const returnFields = `id status createdAt closedAt returnLineItems(first:10) { nodes { ${returnLineFields} } ${pageInfo} }`;
export const refundFields = `id createdAt updatedAt totalRefundedSet ${bag} refundLineItems(first: 10) { nodes { ${refundLineFields} } ${pageInfo} } transactions(first:10) { nodes { ${transactionFields} } ${pageInfo} }`;
export const levelFields = `id updatedAt location { id name isActive } quantities(names: ["available", "on_hand", "committed", "incoming", "reserved"]) { name quantity }`;
export const orderFields = `id createdAt updatedAt processedAt cancelledAt cancelReason test displayFinancialStatus displayFulfillmentStatus currencyCode customer { ${customerFields} } totalPriceSet ${bag} currentTotalPriceSet ${bag} totalReceivedSet ${bag} totalRefundedSet ${bag} lineItems(first: 10) { nodes { ${lineFields} } ${pageInfo} } returns(first: 10) { nodes { ${returnFields} } ${pageInfo} } refunds { ${refundFields} }`;
export const querySpecs = {
  customer: {connection: 'customers', kind: 'Customer', fields: customerFields},
  product: {connection: 'products', kind: 'Product', fields: 'id createdAt updatedAt title handle status'},
  variant: {connection: 'productVariants', kind: 'ProductVariant', fields: 'id createdAt updatedAt title sku product { id } inventoryItem { id }'},
  inventory: {connection: 'inventoryItems', kind: 'InventoryItem', fields: `id createdAt updatedAt sku tracked variant { id product { id } } inventoryLevels(first: 10) { nodes { ${levelFields} } ${pageInfo} }`},
  order: {connection: 'orders', kind: 'Order', fields: orderFields},
  refund: {connection: 'orders', kind: 'Order', fields: orderFields},
} as const;
export type AdminSource = keyof typeof querySpecs;
