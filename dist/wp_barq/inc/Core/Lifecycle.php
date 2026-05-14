<?php
namespace WpBarq\Core;

class Lifecycle {
    public static function activate() {
        // Tasks to perform on plugin activation (e.g., schedule cron, set options)
        if ( ! wp_next_scheduled( 'wp_barq_run_pagespeed_cron' ) ) {
            wp_schedule_event( time(), 'weekly', 'wp_barq_run_pagespeed_cron' );
        }
    }

    public static function deactivate() {
        // Tasks to perform on plugin deactivation (e.g., clear scheduled hooks)
        wp_clear_scheduled_hook( 'wp_barq_scheduled_backup' );
        wp_clear_scheduled_hook( 'wp_barq_run_pagespeed_cron' );
    }
}
