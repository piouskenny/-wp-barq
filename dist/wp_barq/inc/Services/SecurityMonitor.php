<?php
namespace WpBarq\Services;

class SecurityMonitor {
    private $lambda_service;

    public function __construct(LambdaService $lambda_service) {
        $this->lambda_service = $lambda_service;
    }

    public function init() {
        // Monitor failed logins
        add_action('wp_login_failed', [$this, 'handle_failed_login']);
        
        // Setup cron for core file integrity check
        if (!wp_next_scheduled('wp_barq_core_integrity_check')) {
            wp_schedule_event(time(), 'twicedaily', 'wp_barq_core_integrity_check'); // Every 12 hours
        }
        add_action('wp_barq_core_integrity_check', [$this, 'check_core_integrity']);
    }

    public function handle_failed_login($username) {
        // Log individual failure
        $this->lambda_service->dispatch(
            'security_login_fail',
            'MEDIUM',
            "Failed login attempt for username: {$username}",
            ['username' => $username, 'ip' => $this->get_client_ip()]
        );

        // Brute force detection logic (e.g. 5 fails in 5 minutes per IP)
        $ip = $this->get_client_ip();
        $transient_key = 'wp_barq_bf_' . md5($ip);
        $attempts = get_transient($transient_key) ?: 0;
        $attempts++;
        
        set_transient($transient_key, $attempts, 5 * MINUTE_IN_SECONDS);

        if ($attempts >= 5) {
            $this->lambda_service->dispatch(
                'security_brute_force',
                'HIGH',
                "Possible brute force attack detected from IP: {$ip} ({$attempts} attempts in 5 minutes)",
                ['ip' => $ip, 'attempts' => $attempts]
            );
            // We could optionally block the IP here, but we'll stick to monitoring for now.
        }
    }

    public function check_core_integrity() {
        if (!function_exists('get_core_checksums')) {
            require_once ABSPATH . 'wp-admin/includes/update.php';
        }

        global $wp_version;
        $locale = get_locale();
        $checksums = get_core_checksums($wp_version, $locale);
        
        if (!is_array($checksums)) {
            // Couldn't fetch checksums from wp.org
            return;
        }

        $modified_files = [];
        
        foreach ($checksums as $file => $checksum) {
            $filepath = ABSPATH . $file;
            if (file_exists($filepath)) {
                $actual_checksum = md5_file($filepath);
                if ($actual_checksum !== $checksum) {
                    $modified_files[] = $file;
                }
            }
        }

        if (!empty($modified_files)) {
            $this->lambda_service->dispatch(
                'security_file_change',
                'HIGH',
                "Core WordPress file modifications detected. " . count($modified_files) . " file(s) changed.",
                ['modified_files' => array_slice($modified_files, 0, 10)] // Send max 10 to avoid huge payloads
            );
        }
    }

    private function get_client_ip() {
        $ip = '';
        if (isset($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } elseif (isset($_SERVER['REMOTE_ADDR'])) {
            $ip = $_SERVER['REMOTE_ADDR'];
        }
        return sanitize_text_field($ip);
    }
}
