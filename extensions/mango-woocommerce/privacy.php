<?php
if (!defined('ABSPATH')) { exit; }
add_filter('wp_privacy_personal_data_exporters', function ($exporters) {
    $exporters['mango-observations'] = ['exporter_friendly_name'=>'Mango observations','callback'=>function ($email, $page=1) {
        global $wpdb;
        $user = get_user_by('email', $email);
        if (!$user) { return ['data'=>[], 'done'=>true]; }
        $rows = $wpdb->get_results($wpdb->prepare("SELECT id,payload FROM {$wpdb->prefix}mango_events WHERE customer_id=%d ORDER BY id LIMIT 100 OFFSET %d", $user->ID, (max(1,$page)-1)*100));
        return ['data'=>array_map(fn($row)=>['group_id'=>'mango-observations','group_label'=>'Mango observations','item_id'=>$row->id,'data'=>[['name'=>'Observation','value'=>$row->payload]]], $rows), 'done'=>count($rows)<100];
    }];
    return $exporters;
});
function mango_erase_customer($id) {
    global $wpdb;
    $deleted = $wpdb->delete($wpdb->prefix.'mango_events', ['customer_id'=>$id]);
    delete_user_meta($id, '_mango_checkout'); delete_user_meta($id, '_mango_consent');
    return $deleted;
}
add_action('delete_user', 'mango_erase_customer');
add_filter('wp_privacy_personal_data_erasers', function ($erasers) {
    $erasers['mango-observations'] = ['eraser_friendly_name'=>'Mango observations','callback'=>function ($email) {
        $user = get_user_by('email', $email); $deleted = $user ? mango_erase_customer($user->ID) : 0;
        return ['items_removed'=>$deleted > 0,'items_retained'=>$deleted === false,'messages'=>$deleted === false ? ['Mango records could not be erased; try again.'] : [],'done'=>$deleted !== false];
    }];
    return $erasers;
});
