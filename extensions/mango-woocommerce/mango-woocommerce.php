<?php
/**
 * Plugin Name: Mango for WooCommerce
 * Description: Consented identified onsite observations, abandoned checkouts and Mango signup forms.
 * Version: 1.0.0
 * Requires Plugins: woocommerce
 * Requires PHP: 8.1
 */
if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . '/settings.php';
require_once __DIR__ . '/observations.php';
require_once __DIR__ . '/delivery.php';
require_once __DIR__ . '/privacy.php';
register_activation_hook(__FILE__, 'mango_install');
function mango_install() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta("CREATE TABLE {$wpdb->prefix}mango_events (
      id varchar(36) NOT NULL, customer_id bigint unsigned NOT NULL,
      checkout_id varchar(36) NOT NULL DEFAULT '', kind varchar(32) NOT NULL,
      occurred_at bigint NOT NULL, payload longtext NOT NULL, delivered tinyint NOT NULL DEFAULT 0,
      PRIMARY KEY (id), KEY checkout_id (checkout_id), KEY customer_id (customer_id)
    ) {$wpdb->get_charset_collate()};");
}
add_action('rest_api_init', function () {
    foreach (['status','checkouts','events'] as $source) {
        register_rest_route('wc/v3', '/mango/' . $source, [
            'methods' => 'GET', 'permission_callback' => fn() => current_user_can('manage_woocommerce'),
            'callback' => function ($request) use ($source) {
                if ($source === 'status') { return ['version' => 1, 'trackingEnabled' => !empty(get_option('mango_settings', [])['tracking'])]; }
                if (empty(get_option('mango_settings', [])['tracking'])) { return new WP_Error('tracking_disabled', 'Tracking is disabled.', ['status'=>409]); }
                global $wpdb;
                $page = max(1, (int)$request->get_param('page'));
                $size = max(1, min(100, (int)($request->get_param('per_page') ?: 10)));
                // Read only observations whose consent remains granted. GPC withdrawal
                // removes export eligibility without deleting the historical evidence.
                $condition = $source === 'checkouts' ? "e.checkout_id<>''" : "e.checkout_id=''";
                $from = "FROM {$wpdb->prefix}mango_events e INNER JOIN {$wpdb->usermeta} u ON u.user_id=e.customer_id AND u.meta_key='_mango_consent' AND u.meta_value='granted' WHERE $condition AND e.delivered<>2 AND e.occurred_at>=" . (time()-30*DAY_IN_SECONDS);
                $total = (int)$wpdb->get_var("SELECT count(*) $from");
                $rows = $wpdb->get_col($wpdb->prepare("SELECT e.payload $from ORDER BY e.occurred_at,e.id LIMIT %d OFFSET %d", $size, ($page-1)*$size));
                $response = new WP_REST_Response(array_map(fn($raw) => json_decode($raw, true), $rows));
                $response->header('X-WP-TotalPages', (string)ceil($total/$size));
                return $response;
            },
        ]);
    }
});
add_shortcode('mango_form', function () {
    $settings = get_option('mango_settings', []);
    if (empty($settings['endpoint'])) { return ''; }
    $url = wp_parse_url($settings['endpoint']);
    $origin = 'https://' . $url['host'] . (isset($url['port']) ? ':' . $url['port'] : '');
    return '<iframe title="Email signup" src="' . esc_url($origin . '/subscribe') . '" width="100%" height="560" loading="lazy" referrerpolicy="no-referrer"></iframe>';
});

register_deactivation_hook(__FILE__, function () { wp_clear_scheduled_hook('mango_expire_observations'); wp_clear_scheduled_hook('mango_check_checkout'); wp_clear_scheduled_hook('mango_deliver'); });
