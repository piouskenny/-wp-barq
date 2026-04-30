<?php
namespace WpBarq\Services;

use WpBarq\Services\Backup\DatabaseDumper;
use WpBarq\Services\Backup\FileArchiver;
use WpBarq\Services\Backup\S3Service;
use WpBarq\Config\AwsConfig;

class BackupService {
    private $dumper;
    private $archiver;
    private $s3_service;
    private $is_pro;

    public function __construct( DatabaseDumper $dumper, FileArchiver $archiver, $is_pro = false ) {
        $this->dumper   = $dumper;
        $this->archiver = $archiver;
        $this->is_pro   = $is_pro;
    }

    public function init() {
        // Here we could schedule automatic backups.
    }

    public function run_backup() {
        // Increase limits for heavy backup process
        @set_time_limit( 0 );
        @ini_set( 'memory_limit', '512M' );

        // 1. Rate Limit Check
        $last_backup = get_option( 'wp_barq_last_backup_time', 0 );
        $cooldown = $this->get_plan_cooldown();
        
        if ( ( time() - $last_backup ) < $cooldown ) {
            $remaining = round( ( $cooldown - ( time() - $last_backup ) ) / 3600, 1 );
            return new \WP_Error( 'rate_limit', "Rate limit reached. Next backup available in {$remaining} hours." );
        }

        $upload_dir = wp_upload_dir();
        $backup_dir = trailingslashit( $upload_dir['basedir'] ) . 'wp-barq-backups';
        
        if ( ! file_exists( $backup_dir ) ) {
            wp_mkdir_p( $backup_dir );
        }

        $timestamp = date( 'Y-m-d-His' );
        $db_file   = $backup_dir . "/db-{$timestamp}.sql";
        $zip_file  = $backup_dir . "/backup-{$timestamp}.zip";

        // Step 1: Dump Database
        if ( ! $this->dumper->dump( $db_file ) ) {
            $error = 'Database dump failed.';
            do_action( 'wp_barq_backup_failed', $error );
            return new \WP_Error( 'db_dump_failed', $error );
        }

        // Step 2: Archive files (including DB dump)
        if ( ! $this->archiver->archive( ABSPATH, $zip_file ) ) {
            $error = 'File archiving failed.';
            do_action( 'wp_barq_backup_failed', $error );
            return new \WP_Error( 'archive_failed', $error );
        }

        // 2. Size Limit Check
        $size = filesize( $zip_file );
        $max_size = $this->get_plan_max_size();
        
        if ( $size > $max_size ) {
            @unlink( $zip_file );
            $error = "Backup size (" . size_format( $size ) . ") exceeds your plan limit (" . size_format( $max_size ) . ").";
            do_action( 'wp_barq_backup_failed', $error );
            return new \WP_Error( 'size_limit', $error );
        }

        // Cleanup DB file
        @unlink( $db_file );

        // Step 3: Upload to S3 if Pro
        if ( ! $this->is_pro ) {
            return [
                'success' => true,
                'file'    => $zip_file,
                'message' => 'Local backup created. Upgrade to Pro for S3 cloud storage.'
            ];
        }

        $s3_result = $this->upload_to_s3( $zip_file, "backups/backup-{$timestamp}.zip" );
        
        if ( is_wp_error( $s3_result ) ) {
            do_action( 'wp_barq_backup_failed', $s3_result->get_error_message() );
            return $s3_result;
        }

        // Cleanup local ZIP file after successful upload
        @unlink( $zip_file );

        // Update last backup time
        update_option( 'wp_barq_last_backup_time', time() );

        return [
            'success' => true,
            'file'    => "backups/backup-{$timestamp}.zip",
            'url'     => $s3_result
        ];
    }

    private function get_plan_cooldown() {
        $plan = get_option( 'wp_barq_plan', 'free' );
        switch ( $plan ) {
            case 'agency':   return 3600;      // 1 hour
            case 'pro_plus': return 21600;     // 6 hours
            case 'pro':      return 86400;     // 24 hours
            default:         return 604800;    // 7 days (Free)
        }
    }

    private function get_plan_max_size() {
        $plan = get_option( 'wp_barq_plan', 'free' );
        switch ( $plan ) {
            case 'agency':   return 5 * 1024 * 1024 * 1024; // 5GB
            case 'pro_plus': return 2 * 1024 * 1024 * 1024; // 2GB
            case 'pro':      return 500 * 1024 * 1024;      // 500MB
            default:         return 100 * 1024 * 1024;      // 100MB (Free)
        }
    }

    private function upload_to_s3( $file, $key ) {
        $config = AwsConfig::get_s3_config();

        if ( ! $config['region'] || ! $config['access_key'] || ! $config['secret_key'] || ! $config['bucket'] ) {
            return new \WP_Error( 's3_not_configured', 'AWS S3 is not fully configured.' );
        }

        $this->s3_service = new S3Service( 
            $config['region'], 
            $config['access_key'], 
            $config['secret_key'], 
            $config['bucket'] 
        );
        $result = $this->s3_service->upload( $file, $key );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return $result;
    }

    public function list_backups() {
        if ( ! $this->is_pro ) {
            return [];
        }

        $config = AwsConfig::get_s3_config();
        $this->s3_service = new S3Service( 
            $config['region'], 
            $config['access_key'], 
            $config['secret_key'], 
            $config['bucket'] 
        );

        $objects = $this->s3_service->list_objects( 'backups/' );
        $backups = [];

        foreach ( $objects as $object ) {
            $backups[] = [
                'key'  => $object['Key'],
                'size' => $object['Size'],
                'date' => $object['LastModified']->format('Y-m-d H:i:s'),
            ];
        }

        return $backups;
    }

    public function run_restore( $backup_key ) {
        if ( ! $this->is_pro ) {
            return new \WP_Error( 'pro_required', 'Restore feature requires Pro.' );
        }

        $upload_dir = wp_upload_dir();
        $temp_dir   = trailingslashit( $upload_dir['basedir'] ) . 'wp-barq-restore-tmp';
        
        if ( ! file_exists( $temp_dir ) ) {
            wp_mkdir_p( $temp_dir );
        }

        $zip_file = $temp_dir . '/restore.zip';

        // 1. Download from S3
        $config = AwsConfig::get_s3_config();
        $this->s3_service = new S3Service( 
            $config['region'], 
            $config['access_key'], 
            $config['secret_key'], 
            $config['bucket'] 
        );

        $result = $this->s3_service->download( $backup_key, $zip_file );
        if ( is_wp_error( $result ) ) {
            return $result;
        }

        // 2. Extract
        if ( ! $this->archiver->extract( $zip_file, ABSPATH ) ) {
            return new \WP_Error( 'extraction_failed', 'Failed to extract backup.' );
        }

        // 3. Import DB if found
        // Look for .sql files in the extracted content
        $files = glob( ABSPATH . '/*.sql' );
        foreach ( $files as $file ) {
            if ( strpos( basename($file), 'db-' ) === 0 ) {
                $this->dumper->import( $file );
                @unlink( $file );
            }
        }

        // Cleanup
        @unlink( $zip_file );

        return [
            'success' => true,
            'message' => 'Site restored successfully from S3.'
        ];
    }
}
