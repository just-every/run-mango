# Mango for WooCommerce

Copy this directory to `wp-content/plugins/mango-woocommerce` and activate **Mango for WooCommerce**. Requires WordPress, WooCommerce and PHP 8.1 or later. Use HTTPS on both sites.

1. In WooCommerce → Settings → Advanced → REST API, create a **Read** key for a store administrator. In Mango → Settings → WooCommerce, connect the store URL, consumer key, consumer secret and a new webhook secret exclusive to this store’s Mango connection. Mango encrypts these secrets and excludes connection authority from exports.
2. In WooCommerce → Settings → Advanced → Webhooks, use Mango’s displayed webhook URL and that secret for `customer.created`, `customer.updated`, `product.created`, `product.updated`, `order.created` and `order.updated`. Signed order notifications also refresh refunds from the authenticated REST API. Existing order refunds are included by Store’s refund sync.
3. In WooCommerce → Mango, save Mango’s webhook URL with `/plugin` appended and the same secret. The plugin encrypts its copy using the WordPress authentication salt; rotating that salt requires reconnecting the secret. **Enable identified tracking** is off initially. Turn it on only after connecting the consent manager below. In Mango, replace the connection with **Enable the installed Mango WordPress plugin** checked; Mango verifies the plugin status through the store REST API.
4. In Mango → Store, sync Customer, Product, Order, Refund, Cart and Browsing Event. Plugin sources are observations of consented signed-in customers, not a complete census of visitors. No imported store or plugin record subscribes someone to marketing.
5. In Mango → Settings → WooCommerce, save an abandoned-checkout flow with a name and contact tag. It stays a draft until an Owner or Manager activates its exact revision. An eligible plugin event adds that tag once and exits; this starter does not send email or SMS. Pausing, replacing or disconnecting the connection prevents further enrollment. Other visual flow nodes remain separate product obligations.

## Consent and identity

Set `window.mangoConsent = {analytics: true, marketing: true}` before the plugin script runs, or dispatch `new CustomEvent('mango:consent', {detail: {analytics: true, marketing: true}})` when the consent banner changes. Withdrawal uses false for either purpose. Missing consent denies tracking. GPC always denies tracking, even when both consent values are true. The only request on denial is a same-origin consent withdrawal: it records no browsing event and prevents a pending checkout from being exported.

The browser never supplies a customer id or email. WordPress verifies its logged-in session and AJAX nonce, then resolves the current customer. Anonymous visits have no plugin script and are never profiled. After consent, one `mango_session` first-party cookie is set, Secure, HttpOnly, SameSite=Lax, with a 30-day expiry. It is not a cross-site identifier. Cookie state never establishes customer identity.

The plugin emits Active on Site, Viewed Product, Added to Cart, Started Checkout and Abandoned Checkout. Classic checkout and Checkout Blocks are supported. A checkout becomes abandoned after one hour without checkout activity, if consent is still granted and no order was placed. Both checkout completion hooks and an order lookup exclude converted checkouts. WP-Cron is eventual: configure the host’s cron runner for timely detection. Failed network deliveries retain the signed event identity and retry for at most six days; Mango refuses signatures older than five minutes and observations older than seven days. The WordPress event outbox expires after 30 days. Mango retains imported facts under its existing contact and erasure policy; an opt-out or suppression prevents flow enrollment and never becomes permission through a later sync.

## Signup forms

Place `[mango_form]` on a WordPress page. In Mango’s signup settings, allow the exact HTTPS store origin for embedding. The iframe loads Mango’s existing signup form; the reader supplies their address and explicitly confirms the subscription. Store login and tracking consent do not grant marketing subscription consent. The plugin stores no signup address.

## Remove or rotate

Pause live flows and disconnect in Mango before removing the plugin or rotating its secret. Deactivation clears the plugin’s scheduled hooks. Stored WordPress records are retained for their stated period while the plugin is active; deleting the plugin does not silently delete historical data. Use WordPress’s data administration for retained plugin records. Reconnection requires explicit flow activation again.
