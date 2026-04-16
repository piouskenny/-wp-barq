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
        // Schedule disk storage check every 12 hours
        if ( ! wp_next_scheduled( 'wp_barq_storage_check' ) ) {
            wp_schedule_event( time(), 'twicedaily', 'wp_barq_storage_check' );
        }
        add_action( 'wp_barq_storage_check', [ $this, 'check_storage_threshold' ] );
    }

    /**
     * Check if disk usage has breached the threshold and notify if needed.
     * Notifies are throttled to once every 24 hours to prevent alert fatigue.
     */
    public function check_storage_threshold() {
        $disk = $this->check_disk_usage();
        $usage_percent = (int) $disk['value']; // e.g. 76 (from "76%")

        if ( $usage_percent < self::STORAGE_THRESHOLD ) {
            return; // All good, nothing to do
        }

        // Throttle notifications: only send once every 24 hours
        $last_notified = get_transient( 'wp_barq_last_storage_notification' );
        if ( $last_notified ) {
            return; // Already notified recently
        }

        // Set transient to throttle (24 hour window)
        set_transient( 'wp_barq_last_storage_notification', time(), self::NOTIFICATION_COOLDOWN );

        if ( ! $this->notification_service ) {
            return;
        }

        $status_label = $disk['status'] === 'critical' ? '🔴 CRITICAL' : '🟡 WARNING';

        $subject = "WP BARQ: Storage {$status_label} — {$usage_percent}% used";
        $message = "Your server's disk storage has reached {$usage_percent}%.\n\n"
            . "Used:  " . ($disk['total_bytes'] - $disk['free_bytes'] ? size_format($disk['total_bytes'] - $disk['free_bytes']) : 'N/A') . "\n"
            . "Free:  {$disk['free']}\n"
            . "Total: {$disk['total']}\n\n"
            . "Please free up disk space to prevent site downtime.";

        $this->notification_service->notify( $subject, $message, 'health' );
    }

    public function generate_report() {
        $report = [
            'timestamp' => current_time('mysql', 1),
            'status'    => 'healthy',
            'metrics'   => [
                'wordpress_version' => $this->check_wp_version(),
                'php_version'       => $this->check_php_version(),
                'disk_usage'        => $this->check_disk_usage(),
                'cron_health'       => $this->check_cron_health(),
                'uptime'            => '100%', // Placeholder for uptime monitoring
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

    private function check_disk_usage() {
        $free  = disk_free_space( ABSPATH );
        $total = disk_total_space( ABSPATH );
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
            $first = $keys[0];
            if ( $first < time() - 3600 ) {
                $is_late = true;
            }
        }

        return [
            'value'  => $is_late ? 'Late tasks found' : 'Healthy',
            'status' => $is_late ? 'warning' : 'healthy',
        ];
    }
}
