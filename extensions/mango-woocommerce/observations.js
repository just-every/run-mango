/* Consent manager integration: set window.mangoConsent or dispatch
 * new CustomEvent('mango:consent', {detail:{analytics:true,marketing:true}}).
 * Missing consent is denied; identity is resolved only by WordPress. */
(() => {
  const config = window.mangoPlugin;
  if (!config || location.protocol !== 'https:') return;
  const target = new URL(config.ajaxUrl, location.href);
  if (target.protocol !== 'https:' || target.origin !== location.origin) return;
  let consent = window.mangoConsent ?? {}, started = false;
  const allowed = () => consent.analytics === true && consent.marketing === true && navigator.globalPrivacyControl !== true;
  async function observe(kind, productId) {
    const granted = allowed();
    if (!granted && kind !== 'privacy_withdrawal') return;
    const body = new URLSearchParams({action:'mango_observation',nonce:config.nonce,kind,
      analytics:String(consent.analytics === true),marketing:String(consent.marketing === true),gpc:String(navigator.globalPrivacyControl === true)});
    if (productId) body.set('productId', String(productId));
    try { await fetch(config.ajaxUrl, {method:'POST',credentials:'same-origin',body}); }
    catch { /* The server retains accepted observations; no fabricated event. */ }
  }
  function start() {
    if (!allowed() || started) return;
    started = true;
    void observe('active_on_site');
    if (config.productId) void observe('viewed_product', config.productId);
    if (config.checkout) void observe('started_checkout');
  }
  window.addEventListener('mango:consent', event => {
    consent = event.detail ?? {};
    if (!allowed()) { started = false; void observe('privacy_withdrawal'); } else start();
  });
  let checkoutActivity;
  document.addEventListener('change', () => {
    if (!config.checkout || !allowed()) return;
    clearTimeout(checkoutActivity);
    checkoutActivity = setTimeout(() => void observe('started_checkout'), 3000);
  });
  document.addEventListener('wc-blocks_added_to_cart', () => void observe('added_to_cart'));
  if (window.jQuery) window.jQuery(document.body).on('added_to_cart', () => void observe('added_to_cart'));
  // A returning signed-in visitor with GPC must revoke pending checkout eligibility.
  if (!allowed()) void observe('privacy_withdrawal'); else start();
})();
