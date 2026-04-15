<?php
namespace WpBarq\API;

class SettingsEndpoint {
    public function init() {
        add_action( 'rest_api_init', [$this, 'register_routes'] );
    }

    public function register_routes() {
        register_rest_route( 'wp-barq/v1', '/settings', [
            [
                'methods'  => \WP_REST_Server::READABLE,
                'callback' => [$this, 'get_settings'],
                'permission_callback' => [$this, 'permissions_check'],
            ],
            [
                'methods'  => \WP_REST_Server::EDITABLE,
                'callback' => [$this, 'update_settings'],
                'permission_callback' => [$this, 'permissions_check'],
            ]
        ] );
    }

    public function permissions_check() {
        return current_user_can( 'manage_options' );
    }

    public function get_settings() {
        return rest_ensure_response([
            'is_pro'        => get_option( 'wp_barq_is_pro', false ),
            'pro_emails'    => get_option( 'wp_barq_pro_emails', '' ),
            'monitor_faults'  => get_option( 'wp_barq_monitor_faults', true ),
            'monitor_backups' => get_option( 'wp_barq_monitor_backups', true ),
            'monitor_health'  => get_option( 'wp_barq_monitor_health', true ),
            'sns_faults'      => get_option( 'wp_barq_sns_faults', true ),
            'sns_backups'     => get_option( 'wp_barq_sns_backups', true ),
            'sns_health'      => get_option( 'wp_barq_sns_health', true ),
        ]);
    }

    public function update_settings( $request ) {
        $params = $request->get_params();

        $keys = [
            'is_pro', 'pro_emails',
            'monitor_faults', 'monitor_backups', 'monitor_health',
            'sns_faults', 'sns_backups', 'sns_health'
        ];

        foreach ( $keys as $key ) {
            if ( isset( $params[$key] ) ) {
                $value = sanitize_text_field( $params[$key] );
                // Only update secret keys if they are not the masked string
                if ( ( $key === 's3_secret_key' || $key === 'sns_secret_key' ) && $value === '********' ) {
                    continue;
                }
                update_option( "wp_barq_{$key}", $value );
            }
        }

        return rest_ensure_response( ['success' => true] );
    }
}
