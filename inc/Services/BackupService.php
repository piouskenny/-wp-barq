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

        return [
            'success' => true,
            'file'    => "backups/backup-{$timestamp}.zip",
            'url'     => $s3_result
        ];
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
        $url = $this->s3_service->upload( $file, $key );

        if ( ! $url ) {
            return new \WP_Error( 's3_upload_failed', 'S3 upload failed.' );
        }

        return $url;
    }
}
