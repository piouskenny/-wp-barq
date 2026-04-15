<?php
namespace WpBarq\API;

class PageSpeedEndpoint {
    private $pagespeed_service;

    public function __construct( \WpBarq\Services\PageSpeedService $service ) {
        $this->pagespeed_service = $service;
    }

    public function init() {
        add_action( 'rest_api_init', [$this, 'register_routes'] );
    }

    public function register_routes() {
        register_rest_route( 'wp-barq/v1', '/pagespeed', [
            [
                'methods'  => \WP_REST_Server::READABLE,
                'callback' => [$this, 'get_pagespeed_results'],
                'permission_callback' => [$this, 'permissions_check'],
            ],
            [
                'methods'  => \WP_REST_Server::EDITABLE,
                'callback' => [$this, 'trigger_pagespeed_audit'],
                'permission_callback' => [$this, 'permissions_check'],
            ]
        ] );
    }

    public function permissions_check() {
        return current_user_can( 'manage_options' );
    }

    public function get_pagespeed_results() {
        $results = $this->pagespeed_service->get_latest_results();
        return rest_ensure_response( $results );
    }

    public function trigger_pagespeed_audit() {
        $results = $this->pagespeed_service->fetch_scores();

        if ( is_wp_error( $results ) ) {
            return new \WP_Error( 'pagespeed_failed', $results->get_error_message(), ['status' => 500] );
        }

        return rest_ensure_response( $results );
    }
}
