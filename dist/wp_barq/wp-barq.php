<?php
/**
 * Plugin Name: WP BARQ
 * Plugin URI: https://example.com/wp-barq
 * Description: A robust WordPress monitoring and backup system integrated with AWS.
 * Version: 1.0.0
 * Author: Adekunle Kehinde (Piouskenny)
 * Author URI: https://example.com
 * Text Domain: wp-barq
 */

namespace WpBarq;

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

// Define Plugin Constants
define( 'WP_BARQ_VERSION', '1.0.0' );
define( 'WP_BARQ_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WP_BARQ_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Require Composer Autoloader
if ( file_exists( WP_BARQ_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
    require_once WP_BARQ_PLUGIN_DIR . 'vendor/autoload.php';
} else {
    // Show an admin notice if composer vendor/autoload.php doesn't exist
    add_action('admin_notices', function() {
        echo '<div class="notice notice-error"><p>' . esc_html__('WP BARQ requires Composer dependencies. Please run `composer install` in the plugin directory.', 'wp-barq') . '</p></div>';
    });
    return;
}

// Initialize Plugin
function wp_barq_init() {
    Core\Plugin::get_instance()->init();
}
add_action( 'plugins_loaded', 'WpBarq\wp_barq_init' );

// Activation & Deactivation Hooks
register_activation_hook( __FILE__, ['\\WpBarq\\Core\\Lifecycle', 'activate'] );
register_deactivation_hook( __FILE__, ['\\WpBarq\\Core\\Lifecycle', 'deactivate'] );
