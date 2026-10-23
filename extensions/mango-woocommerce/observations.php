<?php
if (!defined('ABSPATH')) { exit; }
add_action('wp_enqueue_scripts', function () {
    if (!is_ssl() || !function_exists('WC') || !is_user_logged_in() || empty(get_option('mango_settings', [])['tracking'])) { return; }
    $checkout = is_checkout() && !is_order_received_page() && !is_checkout_pay_page();
    wp_enqueue_script('mango-observations', plugins_url('observations.js', __FILE__), [], '1.0.0', true);
    wp_add_inline_script('mango-observations', 'window.mangoPlugin=' . wp_json_encode([
        'ajaxUrl' => admin_url('admin-ajax.php'), 'nonce' => wp_create_nonce('mango_observation'),
        'productId' => is_product() ? (string)get_the_ID() : null, 'checkout' => $checkout,
    ]) . ';', 'before');
});
add_action('wp_ajax_mango_observation', function () {
    if (!is_ssl()) { wp_send_json_error(['error'=>'https_required'], 403); }
    check_ajax_referer('mango_observation', 'nonce');
    $customer = get_current_user_id();
    if (empty(get_option('mango_settings', [])['tracking'])) { wp_send_json_error(['error'=>'tracking_disabled'], 403); }
    $granted = ($_POST['analytics'] ?? '') === 'true' && ($_POST['marketing'] ?? '') === 'true' && ($_POST['gpc'] ?? '') === 'false' && ($_SERVER['HTTP_SEC_GPC'] ?? '') !== '1';
    if (!$granted) {
        update_user_meta($customer, '_mango_consent', 'denied');
        setcookie('mango_session', '', ['expires'=>time()-3600,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
        global $wpdb;
        $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->prefix}mango_events WHERE customer_id=%d", $customer));
        $withdrawal = ['version'=>1,'id'=>wp_generate_uuid4(),'kind'=>'privacy_withdrawal','occurredAt'=>gmdate('Y-m-d\TH:i:s\Z'),'customerId'=>(string)$customer,'products'=>[],'consent'=>['analytics'=>false,'marketing'=>false],'gpc'=>($_POST['gpc'] ?? '') === 'true' || ($_SERVER['HTTP_SEC_GPC'] ?? '') === '1'];
        if (!mango_save_event($withdrawal)) { wp_send_json_error(['error'=>'storage_failed'], 503); }
        mango_deliver($withdrawal['id']);
        $pending = get_user_meta($customer, '_mango_checkout', true);
        if (is_array($pending)) { $pending['completed'] = true; update_user_meta($customer, '_mango_checkout', $pending); }
        wp_send_json_error(['error'=>'consent_required'], 403);
    }
    update_user_meta($customer, '_mango_consent', 'granted');
    $kind = sanitize_key($_POST['kind'] ?? '');
    if (!in_array($kind, ['active_on_site','viewed_product','added_to_cart','started_checkout'], true)) { wp_send_json_error([], 400); }
    $products = [];
    if (WC()->cart) { foreach (WC()->cart->get_cart() as $item) { $products[] = (string)$item['product_id']; } }
    if ($kind === 'viewed_product') {
        $product = wc_get_product(absint($_POST['productId'] ?? 0));
        if (!$product || $product->get_status() !== 'publish') { wp_send_json_error([], 400); }
        $products = [(string)$product->get_id()];
    }
    if (count($products) > 50) { wp_send_json_error(['error'=>'cart_too_large'], 422); }
    $session = $_COOKIE['mango_session'] ?? '';
    if (!wp_is_uuid($session)) { $session = wp_generate_uuid4(); }
    setcookie('mango_session', $session, ['expires'=>time()+30*DAY_IN_SECONDS,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
    $event = ['version'=>1,'id'=>wp_generate_uuid4(),'kind'=>$kind,'occurredAt'=>gmdate('Y-m-d\TH:i:s\Z'),'customerId'=>(string)$customer,'products'=>array_values(array_unique($products)),'consent'=>['analytics'=>true,'marketing'=>true],'gpc'=>false];
    if ($kind === 'started_checkout') {
        $checkout = get_user_meta($customer, '_mango_checkout', true);
        if (!is_array($checkout) || !empty($checkout['completed']) || time()-$checkout['activity'] > DAY_IN_SECONDS) { $checkout = ['id'=>wp_generate_uuid4(),'started'=>time()]; }
        $checkout['activity'] = time(); $checkout['products'] = $event['products']; $checkout['cartHash'] = WC()->cart ? WC()->cart->get_cart_hash() : '';
        update_user_meta($customer, '_mango_checkout', $checkout);
        $event['checkoutId'] = $checkout['id']; $event['checkoutStartedAt'] = gmdate('Y-m-d\TH:i:s\Z', $checkout['started']);
        if (!wp_next_scheduled('mango_check_checkout', [$customer, $checkout['id']])) {
            $scheduled = wp_schedule_single_event(time()+HOUR_IN_SECONDS, 'mango_check_checkout', [$customer, $checkout['id']], true);
            if (is_wp_error($scheduled) || !$scheduled) { wp_send_json_error(['error'=>'schedule_failed'], 503); }
        }
    }
    if (!mango_save_event($event)) { wp_send_json_error(['error'=>'storage_failed'], 503); }
    mango_deliver($event['id']);
    wp_send_json_success(['id'=>$event['id']]);
});
function mango_order_placed($order) {
    if (is_numeric($order)) { $order = wc_get_order($order); }
    if (!$order || !$order->get_customer_id()) { return; }
    $checkout = get_user_meta($order->get_customer_id(), '_mango_checkout', true);
    if (is_array($checkout)) { $checkout['completed'] = true; update_user_meta($order->get_customer_id(), '_mango_checkout', $checkout); }
}
add_action('woocommerce_checkout_order_processed', 'mango_order_placed');
add_action('woocommerce_store_api_checkout_order_processed', 'mango_order_placed');
add_action('mango_check_checkout', function ($customer, $id) {
    if (empty(get_option('mango_settings', [])['tracking'])) { return; }
    $checkout = get_user_meta($customer, '_mango_checkout', true);
    if (!is_array($checkout) || $checkout['id'] !== $id || !empty($checkout['completed']) || !empty($checkout['emitted']) || get_user_meta($customer, '_mango_consent', true) !== 'granted') { return; }
    if ($checkout['activity']+HOUR_IN_SECONDS > time()) { wp_schedule_single_event($checkout['activity']+HOUR_IN_SECONDS, 'mango_check_checkout', [$customer,$id], true); return; }
    $orders = wc_get_orders(['customer_id'=>$customer,'date_created'=>'>='.$checkout['started'],'status'=>['pending','processing','on-hold','completed'],'limit'=>1,'return'=>'ids']);
    if ($orders) { return; }
    $event = ['version'=>1,'id'=>$id,'kind'=>'abandoned_checkout','occurredAt'=>gmdate('Y-m-d\TH:i:s\Z'),'customerId'=>(string)$customer,'checkoutId'=>$id,'checkoutStartedAt'=>gmdate('Y-m-d\TH:i:s\Z', $checkout['started']),'products'=>$checkout['products'],'consent'=>['analytics'=>true,'marketing'=>true],'gpc'=>false];
    if (mango_save_event($event)) { $checkout['emitted']=true; update_user_meta($customer, '_mango_checkout', $checkout); mango_deliver($event['id']); }
}, 10, 2);
