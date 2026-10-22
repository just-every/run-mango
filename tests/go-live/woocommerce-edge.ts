import type {IncomingMessage, ServerResponse} from 'node:http';
export function wooCommerceEdge() {
  const at = '2026-10-20T10:00:00', later = '2026-10-21T10:00:00';
  const customer = {id: 11, date_created_gmt: at, date_modified_gmt: later, email: 'woo-reader@example.test', first_name: 'Alex', last_name: 'Orchard', password: 'never-import-this'};
  const product = {id: 21, date_created_gmt: at, date_modified_gmt: later, name: 'Orchard harvest box', status: 'publish', permalink: 'https://woo.example.test/harvest', categories: [{id: 2, name: 'Seasonal produce'}]};
  const order = {id: 31, date_created_gmt: at, date_modified_gmt: later, date_paid_gmt: at, currency: 'AUD', total: '48.00', status: 'completed', billing: customer,
    line_items: [{id: 41, product_id: 21, name: product.name, quantity: 2}], refunds: [{id: 51, total: '-12.00'}], order_key: 'never-import-this', customer_ip_address: '192.0.2.1'};
  const refund = {id: 51, date_created_gmt: later, amount: '12.00', refunded_payment: true, line_items: [{id: 61, product_id: 21, name: product.name, quantity: -1}]};
  const state = {outage: false, secondPageFailure: false, requests: [] as string[], authorizations: [] as string[], customer, product, order, refund};
  async function handle(url: URL, request: IncomingMessage, response: ServerResponse) {
    if (url.hostname !== 'woo.example.test' || !url.pathname.startsWith('/wp-json/wc/v3/')) return false;
    const path = url.pathname.slice('/wp-json/wc/v3/'.length), page = Number(url.searchParams.get('page') ?? '1');
    state.requests.push(path); state.authorizations.push(String(request.headers.authorization));
    const send = (code: number, body: unknown, pages?: number) => {response.writeHead(code, {'Content-Type': 'application/json', ...(pages === undefined ? {} : {'X-WP-TotalPages': String(pages)})}); response.end(JSON.stringify(body));};
    if (state.outage || (path === 'products' && page === 2 && state.secondPageFailure)) {send(503, {private_diagnostic: 'never-import-this'}); return true;}
    if (request.method !== 'GET' || request.headers.authorization !== 'Basic ' + Buffer.from('synthetic-mango-1:synthetic-mango-2').toString('base64')) {send(401, {}); return true;}
    const objects: Record<string, unknown> = {'customers/11': state.customer, 'products/21': state.product, 'orders/31': state.order};
    if (objects[path]) send(200, objects[path]);
    else if (path === 'customers') send(200, page === 1 ? [state.customer] : [], 1);
    else if (path === 'products') send(200, page === 1 ? [state.product] : [{...state.product, id: 22, name: 'Citrus box'}], 2);
    else if (path === 'orders') send(200, page === 1 ? [state.order] : [], 1);
    else if (path === 'orders/31/refunds') send(200, page === 1 ? [state.refund] : [], 1);
    else send(404, {});
    return true;
  }
  return {...state, state, handle};
}
