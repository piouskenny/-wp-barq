<?php
namespace WpBarq\Services\Backup;

use ZipArchive;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;

class FileArchiver {
    public function archive( $source_dir, $destination_zip ) {
        if ( ! extension_loaded( 'zip' ) ) {
            return false;
        }

        $zip = new ZipArchive();
        if ( ! $zip->open( $destination_zip, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
            return false;
        }

        $source_dir = str_replace( '\\', '/', realpath( $source_dir ) );

        if ( is_dir( $source_dir ) ) {
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator( $source_dir ),
                RecursiveIteratorIterator::LEAVES_ONLY
            );

            foreach ( $files as $name => $file ) {
                // Skip directories (they would be added automatically)
                if ( ! $file->isDir() ) {
                    // Get real and relative path for current file
                    $file_path = $file->getRealPath();
                    $relative_path = substr( $file_path, strlen( $source_dir ) + 1 );

                    // Skip the backup file itself if it's in the same directory
                    if ( strpos( $file_path, $destination_zip ) !== false ) {
                        continue;
                    }

                    $zip->addFile( $file_path, $relative_path );
                }
            }
        }

        return $zip->close();
    }
}
