<?php
namespace WpBarq\Config;

/**
 * Centralized AWS Configuration
 * 
 * Replace placeholders with your master AWS credentials.
 * These settings are applied to all Pro users and are not user-configurable.
 */
class AwsConfig {
    // S3 Configuration
    const S3_REGION     = 'us-east-1';
    const S3_ACCESS_KEY = 'YOUR_MASTER_ACCESS_KEY';
    const S3_SECRET_KEY = 'YOUR_MASTER_SECRET_KEY';
    const S3_BUCKET     = 'wp-barq-master-backups';

    // SNS Configuration
    const SNS_REGION     = 'us-east-1';
    const SNS_ACCESS_KEY = 'YOUR_MASTER_ACCESS_KEY';
    const SNS_SECRET_KEY = 'YOUR_MASTER_SECRET_KEY';
    const SNS_TOPIC_ARN  = 'arn:aws:sns:us-east-1:123456789012:wp-barq-monitoring';

    // Lambda Configuration
    const LAMBDA_ENDPOINT_URL  = 'https://your-api-gateway-or-lambda-url.amazonaws.com/';
    const LAMBDA_SHARED_SECRET = 'YOUR_MASTER_LAMBDA_SECRET_KEY';

    /**
     * Get S3 Config
     */
    public static function get_s3_config() {
        return [
            'region'     => self::S3_REGION,
            'access_key' => self::S3_ACCESS_KEY,
            'secret_key' => self::S3_SECRET_KEY,
            'bucket'     => self::S3_BUCKET,
        ];
    }

    /**
     * Get SNS Config
     */
    public static function get_sns_config() {
        return [
            'region'     => self::SNS_REGION,
            'access_key' => self::SNS_ACCESS_KEY,
            'secret_key' => self::SNS_SECRET_KEY,
            'topic_arn'  => self::SNS_TOPIC_ARN,
        ];
    }

    /**
     * Get Lambda Config
     */
    public static function get_lambda_config() {
        return [
            'endpoint_url'   => self::LAMBDA_ENDPOINT_URL,
            'shared_secret'  => self::LAMBDA_SHARED_SECRET,
        ];
    }
}
