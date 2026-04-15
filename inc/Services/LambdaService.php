<?php
namespace WpBarq\Services;

use WpBarq\Config\AwsConfig;

class LambdaService {
    private $endpoint_url;
    private $shared_secret;
    private $is_pro;

    public function __construct($is_pro) {
        $this->is_pro = $is_pro;
        $config = AwsConfig::get_lambda_config();
        
        $this->endpoint_url  = $config['endpoint_url'];
        $this->shared_secret = $config['shared_secret'];
    }

    /**
     * Dispatch an event to Lambda
     * 
     * @param string $type The event type (e.g. php_fatal, security_login_fail)
     * @param string $severity CRITICAL, HIGH, MEDIUM, LOW
     * @param string $message A description of the event
     * @param array $context Additional context data
     * @return bool True on success, false on failure
     */
    public function dispatch($type, $severity, $message, $context = []) {
        if (!$this->is_pro || empty($this->endpoint_url) || empty($this->shared_secret)) {
            return false;
        }

        // Add standard context
        $context['domain'] = parse_url(site_url(), PHP_URL_HOST);
        $context['time']   = current_time('mysql', 1);

        $payload = [
            'type'     => $type,
            'severity' => $severity,
            'message'  => $message,
            'context'  => $context
        ];

        $json_payload = json_encode($payload);
        $signature    = hash_hmac('sha256', $json_payload, $this->shared_secret);

        $args = [
            'body'    => $json_payload,
            'headers' => [
                'Content-Type'      => 'application/json',
                'X-WP-BARQ-Signature' => $signature
            ],
            'timeout' => 5, // Fast timeout, don't hang the site
            'blocking' => true // Needs to be true to know if it sent correctly, but could be false if we don't care
        ];

        $response = wp_remote_post($this->endpoint_url, $args);

        if (is_wp_error($response)) {
            error_log('WP BARQ Lambda Dispatch Error: ' . $response->get_error_message());
            return false;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code < 200 || $response_code >= 300) {
            error_log("WP BARQ Lambda Dispatch Non-200 Response: {$response_code} - " . wp_remote_retrieve_body($response));
            return false;
        }

        return true;
    }
}
