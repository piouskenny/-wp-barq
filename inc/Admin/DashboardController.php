<?php
namespace WpBarq\Admin;

class DashboardController {
    public function init() {
        add_action( 'admin_menu', [$this, 'add_menu_page'] );
        add_action( 'admin_enqueue_scripts', [$this, 'enqueue_scripts'] );
    }

    public function add_menu_page() {
        add_menu_page(
            __( 'WP BARQ Dashboard', 'wp-barq' ),
            __( 'WP BARQ', 'wp-barq' ),
            'manage_options',
            'wp-barq',
            [$this, 'render_dashboard'],
            'dashicons-shield',
            80
        );
        add_submenu_page(
            'wp-barq',
            __( 'Notifications Config', 'wp-barq' ),
            __( 'Notifications', 'wp-barq' ),
            'manage_options',
            'wp-barq-notifications',
            [$this, 'render_dashboard']
        );
        add_submenu_page(
            'wp-barq',
            __( 'Pricing & Plans', 'wp-barq' ),
            __( 'Pricing & Plans', 'wp-barq' ),
            'manage_options',
            'wp-barq-upgrade',
            [$this, 'render_dashboard']
        );
    }

    public function render_dashboard() {
        echo '<div id="wp-barq-root" style="margin-left: -20px; min-height: calc(100vh - 32px); background: #ffffff;"></div>';
    }

    public function enqueue_scripts( $hook ) {
        if ( ! in_array( $hook, ['toplevel_page_wp-barq', 'wp-barq_page_wp-barq-notifications', 'wp-barq_page_wp-barq-upgrade'] ) ) {
            return;
        }

        // Determine if Vite is running in development mode.
        // For production, read the manifest.
        $manifest_path = WP_BARQ_PLUGIN_DIR . 'assets/build/.vite/manifest.json';
        if ( file_exists( $manifest_path ) ) {
            $manifest = json_decode( file_get_contents( $manifest_path ), true );
            
            if ( isset( $manifest['src/main.jsx'] ) ) {
                $js_file = $manifest['src/main.jsx']['file'];
                
                wp_enqueue_script(
                    'wp-barq-dashboard',
                    WP_BARQ_PLUGIN_URL . 'assets/build/' . $js_file,
                    ['wp-element'], // Optional depending on usage
                    WP_BARQ_VERSION,
                    true
                );

                if ( isset( $manifest['src/main.jsx']['css'] ) ) {
                    foreach ( $manifest['src/main.jsx']['css'] as $css_file ) {
                        wp_enqueue_style(
                            'wp-barq-dashboard-' . md5( $css_file ),
                            WP_BARQ_PLUGIN_URL . 'assets/build/' . $css_file,
                            [],
                            WP_BARQ_VERSION
                        );
                    }
                }

                // Pass the REST API nonce to the script.
                wp_localize_script( 'wp-barq-dashboard', 'wpApiSettings', [
                    'root'  => esc_url_raw( rest_url() ),
                    'nonce' => wp_create_nonce( 'wp_rest' ),
                ] );
            }
        }
    }
}
