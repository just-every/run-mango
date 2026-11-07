import {id, line, order, page} from '../shopify/fixtures';
import {sourceEdge} from './source-edge';

/** GraphQL responses only; Mango verifies, normalizes and stores each order. */
export function multistepCommerceEdge() {
  const source = sourceEdge();
  const orders: ReturnType<typeof paidOrder>[] = [];
  const nodeReads: string[] = [];
  function paidOrder(number: number, email: string, purchasedAt: string, customerNumber = number) {
    return {...structuredClone(order), id: id('Order', number), createdAt: purchasedAt, updatedAt: purchasedAt,
      processedAt: purchasedAt, displayFinancialStatus: 'PAID', totalRefundedSet: {
        shopMoney: {amount: '0.00', currencyCode: 'AUD'}, presentmentMoney: {amount: '0.00', currencyCode: 'AUD'},
      }, customer: {...structuredClone(order.customer), id: id('Customer', customerNumber), email, phone: null,
        firstName: null, lastName: null, emailMarketingConsent: null, smsMarketingConsent: null},
      lineItems: page([line()]), returns: page([]), refunds: [],
    };
  }
  return {
    productId: id('Product', 21),
    nodeReads,
    seed(emails: string[], purchasedAt: string) {
      orders.push(...emails.map((email, index) => paidOrder(260 + index, email, purchasedAt)));
    },
    purchase(email: string, purchasedAt: string) {
      const previous = orders.find(value => value.customer.email === email)!;
      const next = paidOrder(270, email, purchasedAt, Number(previous.customer.id.split('/').pop()));
      orders.push(next);
      return next.id;
    },
    commerce(request: Record<string, unknown>) {
      const query = String(request.query), variables = request.variables as {id?: string};
      if (query.includes('MangoNode') && variables.id?.startsWith('gid://shopify/Order/')) {
        nodeReads.push(variables.id);
        const node = orders.find(value => value.id === variables.id);
        if (!node) throw new Error('Unknown synthetic Mango order.');
        return {data: {node}};
      }
      if (query.includes('orders(first:')) return {data: {orders: page(orders)}};
      return source.commerce(request);
    },
  };
}
