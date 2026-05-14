<?php
namespace WpBarq\Services;

use Aws\Sns\SnsClient;

class NotificationService {
    private $client;
    private $topic_arn;
    private $is_pro;
    private $pro_emails;

    public function __construct( $is_pro = false, $pro_emails = '' ) {
        $this->is_pro     = $is_pro;
        $this->pro_emails = $pro_emails;

        if ( ! $this->is_pro ) {
            return;
        }

        $config = \WpBarq\Config\AwsConfig::get_sns_config();

        if ( $config['region'] && $config['access_key'] && $config['secret_key'] && $config['topic_arn'] ) {
            $this->client = new SnsClient([
                'region'      => $config['region'],
                'version'     => 'latest',
                'credentials' => [
                    'key'    => $config['access_key'],
                    'secret' => $config['secret_key'],
                ],
            ]);
            $this->topic_arn = $config['topic_arn'];
        }
    }

    public function notify( $subject, $message, $type = 'health' ) {
        // Check if monitoring for this type is enabled
        if ( ! get_option( "wp_barq_monitor_{$type}", true ) ) {
            return false;
        }

        // Standard notification (Admin Email)
        $this->send_standard_email( $subject, $message );

        // Pro features
        if ( $this->is_pro ) {
            $this->send_pro_emails( $subject, $message );
            
            // Check if SNS trigger for this type is enabled
            if ( get_option( "wp_barq_sns_{$type}", true ) ) {
                $this->publish_sns( $subject, $message );
            }
        }
    }

    private function send_standard_email( $subject, $message ) {
        $admin_email = get_option( 'admin_email' );
        if ( ! $admin_email ) {
            return false;
        }

        return wp_mail( $admin_email, $subject, $message );
    }

    private function send_pro_emails( $subject, $message ) {
        if ( empty( $this->pro_emails ) ) {
            return false;
        }

        $emails = array_map( 'trim', explode( ',', $this->pro_emails ) );
        $emails = array_filter( $emails, 'is_email' );

        if ( empty( $emails ) ) {
            return false;
        }

        // We use wp_mail to send to multiple recipients
        return wp_mail( $emails, $subject, $message );
    }

    private function publish_sns( $subject, $message ) {
        if ( ! $this->client || ! $this->topic_arn ) {
            return false;
        }

        try {
            $this->client->publish([
                'TopicArn' => $this->topic_arn,
                'Subject'  => $subject,
                'Message'  => $message,
            ]);
            return true;
        } catch ( \Exception $e ) {
            error_log( "WP BARQ SNS Notification Error: " . $e->getMessage() );
            return false;
        }
    }
}
