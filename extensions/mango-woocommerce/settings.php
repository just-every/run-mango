<?php
if (!defined('ABSPATH')) { exit; }
function mango_secret($cipher = null) {
    $key = hash('sha256', wp_salt('auth') . ':mango-plugin-v1', true);
    if ($cipher === null) {
        $settings = get_option('mango_settings', []);
        $parts = explode('.', $settings['secret'] ?? '');
        if (count($parts) !== 3) { return ''; }
        return openssl_decrypt(base64_decode($parts[2]), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, base64_decode($parts[0]), base64_decode($parts[1])) ?: '';
    }
    $iv = random_bytes(12); $tag = '';
    $encrypted = openssl_encrypt($cipher, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    return base64_encode($iv) . '.' . base64_encode($tag) . '.' . base64_encode($encrypted);
}
add_action('admin_menu', function () {
    add_submenu_page('woocommerce', 'Mango', 'Mango', 'manage_woocommerce', 'mango', 'mango_settings_page');
});
function mango_settings_page() {
    if (!current_user_can('manage_woocommerce')) { return; }
    $settings = get_option('mango_settings', []);
    if (isset($_POST['mango_save'])) {
        check_admin_referer('mango_settings');
        $endpoint = esc_url_raw(wp_unslash($_POST['endpoint'] ?? ''));
        $secret = wp_unslash($_POST['secret'] ?? '');
        $parts = wp_parse_url($endpoint);
        if (($parts['scheme'] ?? '') !== 'https' || !preg_match('~^/webhooks/commerce/woocommerce/[a-f0-9]{64}/plugin$~', $parts['path'] ?? '') || isset($parts['user']) || isset($parts['query']) || !wp_http_validate_url($endpoint) || ($secret !== '' && (strlen($secret) < 16 || strlen($secret) > 512))) {
            echo '<div class="notice notice-error"><p>Use Mango’s exact public HTTPS plugin endpoint and the exclusive webhook secret.</p></div>';
        } elseif ($secret !== '' || !empty($settings['secret'])) {
            $settings = ['endpoint' => $endpoint, 'secret' => $secret !== '' ? mango_secret($secret) : $settings['secret'], 'tracking' => isset($_POST['tracking'])];
            update_option('mango_settings', $settings, false);
            echo '<div class="notice notice-success"><p>Mango connection saved.</p></div>';
        }
    }
    echo '<div class="wrap"><h1>Mango</h1><p>Tracking is off until your consent manager explicitly grants analytics and marketing. GPC disables tracking. Only signed-in store customers are identified. No marketing message is sent by this plugin.</p><form method="post">';
    wp_nonce_field('mango_settings');
    echo '<p><label>Plugin delivery URL <input class="large-text" name="endpoint" type="url" required value="' . esc_attr($settings['endpoint'] ?? '') . '"></label></p>';
    echo '<p><label>Exclusive webhook secret <input name="secret" type="password" autocomplete="new-password" value=""></label> Leave blank to retain the encrypted secret.</p>';
    echo '<p><label><input type="checkbox" name="tracking" value="1" ' . checked(!empty($settings['tracking']), true, false) . '> Enable identified tracking after explicit consent. WordPress observations expire after 30 days; no anonymous visits are profiled.</label></p>';
    submit_button('Save connection', 'primary', 'mango_save');
    echo '</form><p>Add <code>[mango_form]</code> to a page for the Mango signup form. Allow this store origin in Mango’s signup embed settings. This form uses Mango’s own explicit signup consent.</p></div>';
}
