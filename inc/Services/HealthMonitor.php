<?php
namespace WpBarq\Services;

class HealthMonitor {
    public function init() {
        // Background tasks for health monitor can be scheduled here.
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
        // In a real scenario, ping api.wordpress.org/core/version-check to see if up to date
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
        $free = disk_free_space( ABSPATH );
        $total = disk_total_space( ABSPATH );
        $used = $total - $free;
        $usage_percent = round( ( $used / $total ) * 100 );
        
        $status = 'healthy';
        if ( $usage_percent > 90 ) $status = 'critical';
        elseif ( $usage_percent > 75 ) $status = 'warning';

        return [
            'value'  => $usage_percent . '%',
            'free'   => size_format( $free ),
            'total'  => size_format( $total ),
            'status' => $status,
        ];
    }

    private function check_cron_health() {
        $is_late = false;
        $crons   = _get_cron_array();
        
        if ( is_array( $crons ) ) {
            $keys  = array_keys( $crons );
            $first = $keys[0];
            if ( $first < time() - 3600 ) {
                $is_late = true; // Jobs are an hour late
            }
        }

        return [
            'value'  => $is_late ? 'Late tasks found' : 'Healthy',
            'status' => $is_late ? 'warning' : 'healthy',
        ];
    }
}
