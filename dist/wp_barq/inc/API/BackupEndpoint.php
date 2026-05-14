<?php
namespace WpBarq\API;

class BackupEndpoint {
    private $backup_service;
    private $is_pro;

    public function __construct( \WpBarq\Services\BackupService $service, $is_pro = false ) {
        $this->backup_service = $service;
        $this->is_pro         = $is_pro;
    }

    public function init() {
        add_action( 'rest_api_init', [$this, 'register_routes'] );
    }

    public function register_routes() {
        register_rest_route( 'wp-barq/v1', '/backup', [
            'methods'  => \WP_REST_Server::EDITABLE,
            'callback' => [$this, 'trigger_backup'],
            'permission_callback' => [$this, 'permissions_check'],
        ] );

        register_rest_route( 'wp-barq/v1', '/backups', [
            'methods'  => \WP_REST_Server::READABLE,
            'callback' => [$this, 'get_backups'],
            'permission_callback' => [$this, 'permissions_check'],
        ] );

        register_rest_route( 'wp-barq/v1', '/restore', [
            'methods'  => \WP_REST_Server::EDITABLE,
            'callback' => [$this, 'trigger_restore'],
            'permission_callback' => [$this, 'permissions_check'],
        ] );
    }

    public function permissions_check() {
        return current_user_can( 'manage_options' );
    }

    public function trigger_backup( $request ) {
        if ( ! $this->is_pro ) {
            return new \WP_Error( 'rest_forbidden', 'This feature requires a WP BARQ Pro subscription.', ['status' => 403] );
        }

        $result = $this->backup_service->run_backup();

        if ( is_wp_error( $result ) ) {
            return new \WP_Error( 'backup_failed', $result->get_error_message(), ['status' => 500] );
        }

        return rest_ensure_response( $result );
    }

    public function get_backups( $request ) {
        if ( ! $this->is_pro ) {
            return rest_ensure_response([]);
        }

        $backups = $this->backup_service->list_backups();
        return rest_ensure_response( $backups );
    }

    public function trigger_restore( $request ) {
        if ( ! $this->is_pro ) {
            return new \WP_Error( 'rest_forbidden', 'This feature requires a WP BARQ Pro subscription.', ['status' => 403] );
        }

        $params = $request->get_params();
        $key = $params['key'] ?? '';

        if ( empty( $key ) ) {
            // If no key is provided, try to restore the latest one
            $backups = $this->backup_service->list_backups();
            if ( ! empty( $backups ) ) {
                usort( $backups, function($a, $b) { return strcmp($b['date'], $a['date']); } );
                $key = $backups[0]['key'];
            }
        }

        if ( empty( $key ) ) {
            return new \WP_Error( 'no_backup_found', 'No backup found to restore.', ['status' => 404] );
        }

        $result = $this->backup_service->run_restore( $key );

        if ( is_wp_error( $result ) ) {
            return new \WP_Error( 'restore_failed', $result->get_error_message(), ['status' => 500] );
        }

        return rest_ensure_response( $result );
    }
}
