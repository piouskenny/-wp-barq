<?php
namespace WpBarq\Services\Backup;

use Aws\S3\S3Client;
use Aws\S3\MultipartUploader;
use Aws\Exception\MultipartUploadException;

class S3Service {
    private $client;
    private $bucket;

    public function __construct( $region, $access_key, $secret_key, $bucket ) {
        $this->client = new S3Client([
            'region'      => $region,
            'version'     => 'latest',
            'credentials' => [
                'key'    => $access_key,
                'secret' => $secret_key,
            ],
        ]);
        $this->bucket = $bucket;
    }

    public function upload( $source_file, $key ) {
        $uploader = new MultipartUploader( $this->client, $source_file, [
            'bucket' => $this->bucket,
            'key'    => $key,
        ]);

        try {
            $result = $uploader->upload();
            return $result['ObjectURL'];
        } catch ( MultipartUploadException $e ) {
            $error_msg = "S3 Upload Error: " . $e->getMessage();
            error_log( $error_msg );
            return new \WP_Error( 's3_upload_error', $error_msg );
        } catch ( \Exception $e ) {
            $error_msg = "S3 Error: " . $e->getMessage();
            error_log( $error_msg );
            return new \WP_Error( 's3_generic_error', $error_msg );
        }
    }

    public function download( $key, $save_as ) {
        try {
            $this->client->getObject([
                'Bucket' => $this->bucket,
                'Key'    => $key,
                'SaveAs' => $save_as,
            ]);
            return true;
        } catch ( \Exception $e ) {
            $error_msg = "S3 Download Error: " . $e->getMessage();
            error_log( $error_msg );
            return new \WP_Error( 's3_download_error', $error_msg );
        }
    }

    public function list_objects( $prefix = '' ) {
        try {
            $results = $this->client->listObjectsV2([
                'Bucket' => $this->bucket,
                'Prefix' => $prefix,
            ]);
            return $results['Contents'] ?? [];
        } catch ( \Exception $e ) {
            error_log( "WP BARQ S3 List Error: " . $e->getMessage() );
            return [];
        }
    }
}
