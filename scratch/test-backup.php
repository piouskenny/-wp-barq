<?php
// Load WordPress
define('WP_USE_THEMES', false);
require_once dirname(dirname(dirname(dirname(dirname(__FILE__))))) . '/wp-load.php';

// Force plan to freemium to test
update_option('wp_barq_plan', 'freemium');

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Running backup...\n";
$res = WpBarq\Core\Plugin::get_instance()->get_manager()->get('backup_service')->run_backup();

if (is_wp_error($res)) {
    echo "ERROR: " . $res->get_error_message() . " (" . $res->get_error_code() . ")\n";
} else {
    echo "SUCCESS: \n";
    print_r($res);
}
