<?php
namespace WpBarq\Services;

class HealthMonitor {
    const STORAGE_THRESHOLD    = 75;   // Percentage at which to alert
    const NOTIFICATION_COOLDOWN = DAY_IN_SECONDS; // Don't re-notify within 24 hours

    private $notification_service;

    public function __construct( $notification_service = null ) {
        $this->notification_service = $notification_service;
    }

    public function init() {
        // Schedule disk storage and health check every 12 hours
        if ( ! wp_next_scheduled( 'wp_barq_health_check' ) ) {
            wp_schedule_event( time(), 'twicedaily', 'wp_barq_health_check' );
        }
        add_action( 'wp_barq_health_check', [ $this, 'run_periodic_checks' ] );
    }

    /**
     * Run periodic checks for storage and other health metrics.
     */
    public function run_periodic_checks() {
        $plan = get_option( 'wp_barq_plan', 'free' );
        if ( $plan === 'free' ) {
            return;
        }
        $this->check_storage_threshold();
        $this->check_database_threshold();
    }

    /**
     * Check if disk usage has breached the threshold and notify if needed.
     */
    public function check_storage_threshold() {
        $disk = $this->check_disk_usage();
        $usage_percent = (int) $disk['value'];

        if ( $usage_percent < self::STORAGE_THRESHOLD ) {
            return;
        }

        $last_notified = get_transient( 'wp_barq_last_storage_notification' );
        if ( $last_notified ) {
            return;
        }

        set_transient( 'wp_barq_last_storage_notification', time(), self::NOTIFICATION_COOLDOWN );

        $status_label = $disk['status'] === 'critical' ? '🔴 CRITICAL' : '🟡 WARNING';
        $subject = "WP BARQ: Storage {$status_label} — {$usage_percent}% used";
        $message = "Your server's disk storage has reached {$usage_percent}%.\n\n"
            . "Free:  {$disk['free']}\n"
            . "Total: {$disk['total']}\n\n"
            . "Please free up disk space to prevent site downtime.";

        if ( $this->notification_service ) {
            $this->notification_service->notify( $subject, $message, 'health' );
        }

        if ( $disk['status'] === 'critical' ) {
            do_action( 'wp_barq_health_critical', [
                'type'    => 'storage_full',
                'message' => $message,
                'context' => $disk
            ] );
        }
    }

    /**
     * Check if database is responding correctly.
     */
    public function check_database_threshold() {
        $db_health = $this->check_database_health();
        
        if ( $db_health['status'] !== 'critical' ) {
            return;
        }

        $last_notified = get_transient( 'wp_barq_last_db_notification' );
        if ( $last_notified ) {
            return;
        }

        set_transient( 'wp_barq_last_db_notification', time(), self::NOTIFICATION_COOLDOWN );

        $subject = "WP BARQ: Database CRITICAL — Connection Issues Detected";
        $message = "Critical database health issues detected on your site.\n\nDetails: " . $db_health['value'];

        if ( $this->notification_service ) {
            $this->notification_service->notify( $subject, $message, 'health' );
        }

        do_action( 'wp_barq_health_critical', [
            'type'    => 'database_fail',
            'message' => $message,
            'context' => $db_health
        ] );
    }

    public function generate_report() {
        $plan = get_option( 'wp_barq_plan', 'free' );
        if ( $plan === 'free' ) {
            return [
                'timestamp' => current_time('mysql', 1),
                'status'    => 'healthy',
                'metrics'   => [
                    'disk_usage' => $this->check_disk_usage(),
                ]
            ];
        }

        $report = [
            'timestamp' => current_time('mysql', 1),
            'status'    => 'healthy',
            'metrics'   => [
                'wordpress_version' => $this->check_wp_version(),
                'php_version'       => $this->check_php_version(),
                'database_health'   => $this->check_database_health(),
                'disk_usage'        => $this->check_disk_usage(),
                'cron_health'       => $this->check_cron_health(),
                'uptime_status'     => $this->check_uptime_status(),
            ]
        ];

        // Determine overall status
        foreach ( $report['metrics'] as $metric ) {
            if ( is_array($metric) && isset($metric['status']) ) {
                if ( $metric['status'] === 'critical' ) {
                    $report['status'] = 'critical';
                    break;
                }
                if ( $metric['status'] === 'warning' && $report['status'] !== 'critical' ) {
                    $report['status'] = 'warning';
                }
            }
        }

        return $report;
    }

    private function check_wp_version() {
        global $wp_version;
        return [
            'value'  => $wp_version,
            'status' => 'healthy',
        ];
    }

    private function check_php_version() {
        $php_version = phpversion();
        $status = version_compare( $php_version, '7.4', '>=' ) ? 'healthy' : 'warning';
        return [
            'value'  => $php_version,
            'status' => $status,
        ];
    }

    private function check_database_health() {
        global $wpdb;
        
        // 1. Check if $wpdb is functional
        if ( ! isset( $wpdb ) || ! $wpdb->ready ) {
            return [ 'value' => 'Database object not ready', 'status' => 'critical' ];
        }

        // 2. Try a simple query
        $result = $wpdb->get_var( "SELECT 1" );
        if ( $result != 1 ) {
            return [ 'value' => 'Basic query failed', 'status' => 'critical' ];
        }

        return [ 'value' => 'Healthy', 'status' => 'healthy' ];
    }

    private function check_disk_usage() {
        $free  = @disk_free_space( ABSPATH );
        $total = @disk_total_space( ABSPATH );
        
        if ( $free === false || $total === false ) {
            return [ 'value' => 'Unknown', 'status' => 'warning' ];
        }

        $used  = $total - $free;
        $usage_percent = round( ( $used / $total ) * 100 );

        $status = 'healthy';
        if ( $usage_percent > 90 ) $status = 'critical';
        elseif ( $usage_percent >= self::STORAGE_THRESHOLD ) $status = 'warning';

        return [
            'value'       => $usage_percent . '%',
            'free'        => size_format( $free ),
            'total'       => size_format( $total ),
            'free_bytes'  => $free,
            'total_bytes' => $total,
            'status'      => $status,
        ];
    }

    private function check_cron_health() {
        $is_late = false;
        $crons   = _get_cron_array();

        if ( is_array( $crons ) ) {
            $keys  = array_keys( $crons );
            if ( !empty($keys) ) {
                $first = $keys[0];
                if ( $first < time() - 3600 ) {
                    $is_late = true;
                }
            }
        }

        return [
            'value'  => $is_late ? 'Late tasks found' : 'Healthy',
            'status' => $is_late ? 'warning' : 'healthy',
        ];
    }

    private function check_uptime_status() {
        // In-plugin uptime detection checks for recent critical failures
        $upload_dir = wp_upload_dir();
        $log_file = trailingslashit( $upload_dir['basedir'] ) . 'wp-barq-logs/faults.log';
        
        if ( ! file_exists( $log_file ) ) {
            return [ 'value' => '100% (No faults recorded)', 'status' => 'healthy' ];
        }

        // Read last 20 lines of the log
        $lines = array_slice( file( $log_file ), -20 );
        $critical_count = 0;
        $now = time();
        $one_hour_ago = $now - 3600;

        foreach ( $lines as $line ) {
            $entry = json_decode( $line, true );
            if ( $entry && $entry['severity'] === 'CRITICAL' ) {
                $timestamp = strtotime( $entry['timestamp'] );
                if ( $timestamp > $one_hour_ago ) {
                    $critical_count++;
                }
            }
        }

        if ( $critical_count >= 5 ) {
            return [ 'value' => 'High failure rate detected (Unstable)', 'status' => 'critical' ];
        }

        if ( $critical_count > 0 ) {
            return [ 'value' => 'Degraded (Recent faults)', 'status' => 'warning' ];
        }

        return [ 'value' => 'Stable', 'status' => 'healthy' ];
    }

}
