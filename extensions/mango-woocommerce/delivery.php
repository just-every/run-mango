<?php
if (!defined('ABSPATH')) { exit; }
function mango_save_event($event) {
    global $wpdb;
    return $wpdb->insert($wpdb->prefix.'mango_events', ['id'=>$event['id'],'customer_id'=>(int)$event['customerId'],'checkout_id'=>$event['checkoutId'] ?? '','kind'=>$event['kind'],'occurred_at'=>strtotime($event['occurredAt']),'payload'=>wp_json_encode($event),'delivered'=>0]) !== false;
}
function mango_deliver($id) {
    global $wpdb;
    $event = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}mango_events WHERE id=%s AND delivered=0", $id));
    if (!$event || ($event->kind !== 'privacy_withdrawal' && get_user_meta($event->customer_id, '_mango_consent', true) !== 'granted')) { return; }
    $settings = get_option('mango_settings', []); $secret = mango_secret();
    if (empty($settings['tracking']) || empty($settings['endpoint']) || strtolower(wp_parse_url($settings['endpoint'], PHP_URL_SCHEME) ?? '') !== 'https' || !$secret) { return; }
    $timestamp = (string)time();
    $response = wp_safe_remote_post($settings['endpoint'], ['timeout'=>15,'redirection'=>0,'sslverify'=>true,'headers'=>[
        'Content-Type'=>'application/json','X-Mango-Timestamp'=>$timestamp,
        'X-Mango-Signature'=>base64_encode(hash_hmac('sha256', "mango-plugin-v1\n".$timestamp.'.'.$event->payload, $secret, true)),
    ],'body'=>$event->payload]);
    if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 204) {
        $wpdb->update($wpdb->prefix.'mango_events', ['delivered'=>1], ['id'=>$id]);
    } elseif (time()-$event->occurred_at < 6*DAY_IN_SECONDS && !wp_next_scheduled('mango_deliver', [$id])) {
        wp_schedule_single_event(time()+15*MINUTE_IN_SECONDS, 'mango_deliver', [$id], true);
    }
}
add_action('mango_deliver', 'mango_deliver');

add_action('init', function () {
    if (!wp_next_scheduled('mango_expire_observations')) { wp_schedule_event(time()+DAY_IN_SECONDS, 'daily', 'mango_expire_observations'); }
});
add_action('mango_expire_observations', function () {
    global $wpdb;
    $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->prefix}mango_events WHERE occurred_at<%d", time()-30*DAY_IN_SECONDS));
});
