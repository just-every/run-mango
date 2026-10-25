import {productCatalog,variantCatalog} from './catalog';
import type {SourceRecordInput} from '@/core/shared/platform';
import {sha256} from '@/core/shared/ids';
import {date, gid, integer, list, moneyBag, object, text, type Node} from './values';
import type {AdminSource} from './queries';

function nullableString(value: unknown, label: string): string | null {
  if(value===null)return null;
  if(typeof value!=='string')throw new Error(`Shopify ${label} is missing or malformed.`);
  return value;
}
function consent(value: unknown, label: string) {
  if(value===null)return null;
  const source=object(value,label);
  return {marketingState:text(source.marketingState,`${label} state`),marketingOptInLevel:nullableString(source.marketingOptInLevel,`${label} opt-in level`),
    consentUpdatedAt:source.consentUpdatedAt===null?null:date(source.consentUpdatedAt,`${label} update`).toISOString()};
}
function customer(value: unknown) {
  if (value === null) return null;
  const c = object(value, 'customer');
  const address=c.defaultAddress===null?null:object(c.defaultAddress,'customer address');
  const location=address===null?null:{city:nullableString(address.city,'city'),provinceCode:nullableString(address.provinceCode,'province code'),countryCodeV2:nullableString(address.countryCodeV2,'country code'),zip:nullableString(address.zip,'postal code')};
  return {id: gid('Customer', c.id), email: nullableString(c.email,'email'), phone: nullableString(c.phone,'phone'), firstName: nullableString(c.firstName,'first name'), lastName: nullableString(c.lastName,'last name'),
    location, sourceConsent: {email: consent(c.emailMarketingConsent,'email source consent'), sms: consent(c.smsMarketingConsent,'SMS source consent')}};
}
function line(value: Node) {
  return {id: gid('LineItem', value.id), productId: value.product === null ? null : gid('Product', object(value.product).id),
    variantId: value.variant === null ? null : gid('ProductVariant', object(value.variant).id),
    quantity: integer(value.quantity, 'line quantity'), currentQuantity: integer(value.currentQuantity, 'current line quantity'),
    originalTotal: moneyBag(value.originalTotalSet), discountedTotal: moneyBag(value.discountedTotalSet)};
}
function refund(value: Node, order: Node) {
  const transactions = list(value.transactions,'refund transactions').map(tx=>{
    if(typeof tx.test!=='boolean')throw new Error('Shopify transaction test state is missing.');
    return {id:gid('OrderTransaction',tx.id),kind:text(tx.kind,'transaction kind'),status:text(tx.status,'transaction status'),test:tx.test,
      createdAt:date(tx.createdAt,'transaction creation').toISOString(),processedAt:tx.processedAt===null?null:date(tx.processedAt,'transaction processing').toISOString(),amount:moneyBag(tx.amountSet)};
  });
  const refundTransactions=transactions.filter(tx=>tx.kind==='REFUND');
  const financialState=refundTransactions.length&&refundTransactions.every(tx=>tx.status==='SUCCESS'&&!tx.test)?'SUCCESS':refundTransactions.some(tx=>tx.status==='PENDING'||tx.status==='AWAITING_RESPONSE')?'PENDING':refundTransactions.some(tx=>tx.status==='FAILURE'||tx.status==='ERROR')?'FAILURE':'UNKNOWN';
  return {schema: 'shopify-commerce-v1', id: gid('Refund', value.id), createdAt: date(value.createdAt, 'refund creation').toISOString(),
    updatedAt: date(value.updatedAt, 'refund update').toISOString(), orderId: gid('Order', order.id), customer: customer(order.customer),
    total: moneyBag(value.totalRefundedSet), transactions, financialState, lines: list(value.refundLineItems, 'refund lines').map(item => ({line: line(object(item.lineItem)), quantity: integer(item.quantity, 'refund quantity'), restockType: text(item.restockType, 'restock type'), subtotal: moneyBag(item.subtotalSet), tax: moneyBag(item.totalTaxSet)}))};
}
function inventoryLevel(level: Node) {
  const location=object(level.location,'inventory location');
  if(typeof location.isActive!=='boolean')throw new Error('Shopify inventory location activity is missing.');
  const quantities=list(level.quantities,'inventory quantities').map(q=>({name:text(q.name,'quantity name'),quantity:integer(q.quantity,'inventory quantity')}));
  const names=new Set(quantities.map(q=>q.name));
  if(names.size!==quantities.length||['available','on_hand','committed','incoming','reserved'].some(name=>!names.has(name)))throw new Error('Shopify inventory quantities are incomplete.');
  return {id:text(level.id,'inventory level ID'),updatedAt:date(level.updatedAt,'inventory level update').toISOString(),location:{id:gid('Location',location.id),name:text(location.name,'location name'),isActive:location.isActive},quantities};
}
export function normalizeAdmin(type: AdminSource, n: Node): SourceRecordInput[] {
  if (type === 'refund') return list(n.refunds, 'refunds').map(value => {
    const payload = refund(value, n);
    return {sourceType: type, sourceId: payload.id, occurredAt: new Date(payload.createdAt), updatedAt: new Date(payload.updatedAt), payload};
  });
  const kind = {customer:'Customer', product:'Product', variant:'ProductVariant', inventory:'InventoryItem', order:'Order'}[type];
  const created = date(n.createdAt, 'creation'), updated = date(n.updatedAt, 'update'), id = gid(kind, n.id);
  let facts: Node;
  if (type === 'customer') facts = {...customer(n), customer: customer(n)};
  // Current catalog placement: every collection page is drained, and Shopify
  // reports an uncategorized product's taxonomy category as null.
  else if (type === 'product') facts = {catalog:productCatalog(n),title: text(n.title, 'product title'), handle: text(n.handle, 'product handle'), status: text(n.status, 'product status'),
    collectionIds: list(n.collections, 'product collections').map(item => gid('Collection', item.id)),
    category: n.category === null ? null : text(object(n.category, 'product category').fullName, 'product category')};
  else if (type === 'variant') facts = {catalog:variantCatalog(n),productId: gid('Product', object(n.product).id), inventoryItemId: gid('InventoryItem', object(n.inventoryItem).id), title: text(n.title,'variant title'), sku: nullableString(n.sku,'variant SKU')};
  else if (type === 'inventory') {
    if (typeof n.tracked !== 'boolean') throw new Error('Shopify inventory tracking state is missing.');
    facts = {tracked: n.tracked, sku: nullableString(n.sku,'inventory SKU'), variantId: gid('ProductVariant', object(n.variant).id), productId: gid('Product', object(object(n.variant).product).id),
      levels: list(n.inventoryLevels, 'inventory levels').map(inventoryLevel)};
  } else {
    if (typeof n.test !== 'boolean' || n.cancelledAt === undefined) throw new Error('Shopify order lifecycle state is missing.');
    facts = {customer: customer(n.customer), test: n.test, cancelledAt: n.cancelledAt === null ? null : date(n.cancelledAt, 'cancellation').toISOString(),
      cancelReason: n.cancelReason === null ? null : text(n.cancelReason,'cancel reason'),
      processedAt: n.processedAt === null ? null : date(n.processedAt, 'processed time').toISOString(), financialStatus: text(n.displayFinancialStatus, 'financial status'), fulfillmentStatus: text(n.displayFulfillmentStatus, 'fulfillment status'),
      total: moneyBag(n.totalPriceSet), currentTotal: moneyBag(n.currentTotalPriceSet), received: moneyBag(n.totalReceivedSet), refunded: moneyBag(n.totalRefundedSet),
      lines: list(n.lineItems, 'order lines').map(line), returns: list(n.returns, 'returns').map(r => ({id: gid('Return', r.id), status: text(r.status, 'return status'),createdAt:date(r.createdAt,'return creation').toISOString(),closedAt:r.closedAt===null?null:date(r.closedAt,'return closure').toISOString(),lines:list(r.returnLineItems,'return lines').map(item=>{if(item.__typename!=='ReturnLineItem')throw new Error('Unsupported Shopify return line type.');return {id:gid('ReturnLineItem',item.id),quantity:integer(item.quantity,'return quantity'),refundedQuantity:integer(item.refundedQuantity,'returned refunded quantity'),refundableQuantity:integer(item.refundableQuantity,'return refundable quantity'),line:line(object(object(item.fulfillmentLineItem).lineItem))};})})), refunds: list(n.refunds, 'refunds').map(r => refund(r,n))};
  }
  const version=type==='inventory'?new Date(Math.max(updated.getTime(),...(facts.levels as Array<{updatedAt:string}>).map(level=>Date.parse(level.updatedAt)))):updated;
  return [{sourceType: type, sourceId: id, occurredAt: created, updatedAt: version, payload: {schema: 'shopify-commerce-v1', id, createdAt: created.toISOString(), updatedAt: updated.toISOString(), ...facts}}];
}
export async function normalizeCart(n: Node): Promise<SourceRecordInput> {
  // Shopify's cart ID can itself be a bearer capability. Preserve stable string
  // identity through a one-way digest; never retain the token or recovery URL.
  const id = `shopify-cart:${await sha256(text(n.id, 'cart ID'))}`;
  const created = date(n.created_at, 'cart creation'), updated = date(n.updated_at, 'cart update');
  const lines = list(n.line_items, 'cart lines').map(item => ({
    productId: item.product_id === null ? null : gid('Product', item.product_id),
    variantId: item.variant_id === null ? null : gid('ProductVariant', item.variant_id),
    quantity: integer(item.quantity, 'cart line quantity'),
    price: item.price === undefined ? null : String(item.price),
  }));
  // Cart notifications do not establish a customer, even when caller-added
  // customer/email fields are present. Recipient binding requires signed context.
  return {sourceType:'cart', sourceId:id, occurredAt:created, updatedAt:updated,
    payload:{schema:'shopify-commerce-v1', id, createdAt:created.toISOString(), updatedAt:updated.toISOString(), observation:'online-store-cart-webhook', lines}};
}
