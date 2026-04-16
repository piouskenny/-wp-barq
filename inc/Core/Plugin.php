<?php
namespace WpBarq\Core;

class Plugin {
    private static $instance = null;
    private $service_manager;

    private function __construct() {
        // Private constructor for singleton
    }

    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function init() {
        // Initialize services and modules here
        $this->service_manager = new ServiceManager();

        // --- Resolve options and core services first ---
        $is_pro     = get_option( 'wp_barq_is_pro', false );
        $pro_emails = get_option( 'wp_barq_pro_emails', '' );

        $notification_service = new \WpBarq\Services\NotificationService( $is_pro, $pro_emails );
        $this->service_manager->register( 'notification_service', $notification_service );

        $lambda_service = new \WpBarq\Services\LambdaService( $is_pro );
        $this->service_manager->register( 'lambda_service', $lambda_service );

        // --- Dashboard & Admin ---
        $this->service_manager->register( 'dashboard', new \WpBarq\Admin\DashboardController() );

        // --- Health Monitor (depends on notification_service) ---
        $health_monitor = new \WpBarq\Services\HealthMonitor( $notification_service );
        $this->service_manager->register( 'health_monitor', $health_monitor );
        $this->service_manager->register( 'health_api', new \WpBarq\API\HealthEndpoint( $health_monitor ) );
        $this->service_manager->register( 'settings_api', new \WpBarq\API\SettingsEndpoint() );

        // --- Fault Detector (error/exception handler) ---
        $this->service_manager->register( 'fault_detector', new \WpBarq\Services\FaultDetector() );

        // --- PageSpeed ---
        $pagespeed_service = new \WpBarq\Services\PageSpeedService();
        $this->service_manager->register( 'pagespeed_service', $pagespeed_service );
        $this->service_manager->register( 'pagespeed_api', new \WpBarq\API\PageSpeedEndpoint( $pagespeed_service ) );

        // --- Backup (Pro: S3 upload) ---
        $backup_service = new \WpBarq\Services\BackupService(
            new \WpBarq\Services\Backup\DatabaseDumper(),
            new \WpBarq\Services\Backup\FileArchiver(),
            $is_pro
        );
        $this->service_manager->register( 'backup_service', $backup_service );
        $this->service_manager->register( 'backup_api', new \WpBarq\API\BackupEndpoint( $backup_service, $is_pro ) );

        // --- Security Monitor (Pro only) ---
        if ( $is_pro ) {
            $security_monitor = new \WpBarq\Services\SecurityMonitor( $lambda_service );
            $security_monitor->init();
            $this->service_manager->register( 'security_monitor', $security_monitor );
        }

        
        // Trigger notifications on critical faults
        add_action( 'wp_barq_critical_fault', function( $error ) use ( $notification_service, $lambda_service ) {
            $notification_service->notify( 
                'WP BARQ: Critical Fault Detected', 
                sprintf( "Message: %s\nFile: %s\nLine: %d", $error['message'], $error['file'], $error['line'] ),
                'faults'
            );

            // Dispatch to Lambda
            $lambda_service->dispatch(
                'php_fatal',
                'CRITICAL',
                $error['message'],
                ['file' => $error['file'], 'line' => $error['line']]
            );
        });

        // Trigger notifications on backup failures
        add_action( 'wp_barq_backup_failed', function( $error_message ) use ( $notification_service ) {
            $notification_service->notify( 
                'WP BARQ: Backup Failed', 
                "The scheduled backup failed with the following error:\n" . $error_message,
                'backups'
            );
        });

        $this->service_manager->init_services();
    }
    
    public function get_manager() {
        return $this->service_manager;
    }
}
