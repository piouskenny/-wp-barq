<?php
namespace WpBarq\Services\Backup;

use ZipArchive;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;

class FileArchiver {
    /**
     * Archive an associative list of sources into a zip.
     * Keys are absolute paths (file or directory), values are the zip entry name / prefix.
     *
     * @param array  $sources          [ '/abs/path/to/dir' => 'zip-folder-name', '/abs/path/to/file.sql' => 'file.sql' ]
     * @param string $destination_zip  Absolute path for the resulting zip file.
     * @return bool
     */
    public function archive_sources( array $sources, $destination_zip ) {
        if ( ! extension_loaded( 'zip' ) ) {
            return false;
        }

        $zip = new ZipArchive();
        if ( ! $zip->open( $destination_zip, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
            return false;
        }

        // Directories we always skip regardless of source
        $skip_dir_fragments = [
            'node_modules' . DIRECTORY_SEPARATOR,
            '.git'         . DIRECTORY_SEPARATOR,
            'cache'        . DIRECTORY_SEPARATOR,
            'wp-barq-backups',
            'wp-barq-restore-tmp',
        ];

        $restricted_exts = ['mp4', 'mov', 'avi', 'zip', 'gz', 'tar', 'log'];

        foreach ( $sources as $source => $zip_prefix ) {
            $source = str_replace( '\\', '/', realpath( $source ) );

            if ( ! $source ) {
                continue;
            }

            if ( is_file( $source ) ) {
                // Single file — add directly under the given zip entry name
                $zip->addFile( $source, $zip_prefix );
                continue;
            }

            if ( is_dir( $source ) ) {
                $iterator = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator( $source, RecursiveDirectoryIterator::SKIP_DOTS ),
                    RecursiveIteratorIterator::LEAVES_ONLY
                );

                foreach ( $iterator as $file ) {
                    if ( $file->isDir() ) {
                        continue;
                    }

                    $file_path     = str_replace( '\\', '/', $file->getRealPath() );
                    $relative_path = substr( $file_path, strlen( $source ) + 1 );

                    // Skip the destination zip itself
                    if ( $file_path === str_replace( '\\', '/', $destination_zip ) ) {
                        continue;
                    }

                    // Skip restricted extensions
                    $ext = strtolower( pathinfo( $file_path, PATHINFO_EXTENSION ) );
                    if ( in_array( $ext, $restricted_exts ) ) {
                        continue;
                    }

                    // Skip restricted directories
                    $skip = false;
                    foreach ( $skip_dir_fragments as $fragment ) {
                        if ( strpos( $relative_path, $fragment ) !== false ) {
                            $skip = true;
                            break;
                        }
                    }
                    if ( $skip ) {
                        continue;
                    }

                    $zip->addFile( $file_path, $zip_prefix . '/' . $relative_path );
                }
            }
        }

        return $zip->close();
    }

    /**
     * Legacy method — archives a single directory.
     * Kept for backwards compatibility.
     */
    public function archive( $source_dir, $destination_zip ) {
        return $this->archive_sources(
            [ $source_dir => basename( rtrim( $source_dir, '/\\' ) ) ],
            $destination_zip
        );
    }

    public function extract( $zip_file, $destination_dir ) {
        if ( ! extension_loaded( 'zip' ) ) {
            return false;
        }

        $zip = new ZipArchive();
        if ( $zip->open( $zip_file ) === true ) {
            $zip->extractTo( $destination_dir );
            $zip->close();
            return true;
        } else {
            return false;
        }
    }
}
