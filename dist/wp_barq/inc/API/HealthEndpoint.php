<?php
namespace WpBarq\API;

class HealthEndpoint {
    private $health_monitor;

    public function __construct( \WpBarq\Services\HealthMonitor $monitor ) {
        $this->health_monitor = $monitor;
    }

    public function init() {
        add_action( 'rest_api_init', [$this, 'register_routes'] );
    }

    public function register_routes() {
        register_rest_route( 'wp-barq/v1', '/health', [
            'methods'  => \WP_REST_Server::READABLE,
            'callback' => [$this, 'get_health_report'],
            'permission_callback' => [$this, 'permissions_check'],
        ] );
    }

    public function permissions_check( $request ) {
        // Here we could check for an API key if accessed externally by AWS,
        // or check for manage_options if accessed from the WP admin dashboard.
        // For now, ensuring user can manage options or has valid API key.
        if ( current_user_can( 'manage_options' ) ) {
            return true;
        }
        
        $api_key = $request->get_header('X-Barq-Api-Key');
        $stored_key = get_option('wp_barq_api_key');
        
        if ( !empty($stored_key) && $api_key === $stored_key ) {
            return true;
        }

        return new \WP_Error( 'rest_forbidden', esc_html__( 'Unauthorized.', 'wp-barq' ), ['status' => 401] );
    }

    public function get_health_report( $request ) {
        $report = $this->health_monitor->generate_report();
        $response = rest_ensure_response( $report );

        if ( $report['status'] === 'critical' ) {
            $response->set_status( 503 );
        }

        return $response;
    }

}
