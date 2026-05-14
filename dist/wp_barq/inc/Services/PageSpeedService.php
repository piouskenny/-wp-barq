<?php
namespace WpBarq\Services;

class PageSpeedService {
    private $api_url = 'https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed';

    public function init() {
        // Hook for automated cron task
        add_action( 'wp_barq_run_pagespeed_cron', [$this, 'run_automated_audit'] );
    }

    public function run_automated_audit() {
        $this->fetch_scores();
    }

    public function fetch_scores() {
        $api_key = 'AIzaSyAYolpetBqw8mmDK9ZD5chLp0SRLtQPeJ8';

        $site_url = home_url();
        $results  = [
            'timestamp' => current_time( 'mysql' ),
            'mobile'    => $this->get_strategy_score( $site_url, $api_key, 'mobile' ),
            'desktop'   => $this->get_strategy_score( $site_url, $api_key, 'desktop' ),
        ];

        // Manage History
        $history = get_option( 'wp_barq_pagespeed_history', [] );
        array_unshift( $history, $results );
        $history = array_slice( $history, 0, 10 ); // Keep last 10 audits
        update_option( 'wp_barq_pagespeed_history', $history );

        update_option( 'wp_barq_pagespeed_results', $results );

        return $results;
    }

    private function get_strategy_score( $url, $key, $strategy ) {
        // Improved local URL detection
        $host = parse_url( $url, PHP_URL_HOST );
        $is_local = false;

        if ( $host ) {
            if ( in_array( $host, ['localhost', '127.0.0.1', '::1' ] ) ) {
                $is_local = true;
            } elseif ( preg_match( '/\.(local|test|dev|example|invalid)$/i', $host ) ) {
                $is_local = true;
            } elseif ( filter_var( $host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) ) {
                // Check for private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
                if ( !filter_var( $host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
                    $is_local = true;
                }
            }
        }

        if ( $is_local ) {
            return $this->get_local_lighthouse_score( $url, $strategy );
        }

        $request_url = add_query_arg([
            'url'      => $url,
            'key'      => $key,
            'strategy' => $strategy,
            'category' => 'performance'
        ], $this->api_url );

        $response = wp_remote_get( $request_url, ['timeout' => 120] );

        if ( is_wp_error( $response ) ) {
            return ['score' => 0, 'error' => $response->get_error_message()];
        }

        $body = wp_remote_retrieve_body( $response );
        $data = json_decode( $body, true );

        if ( isset( $data['lighthouseResult']['categories']['performance']['score'] ) ) {
            $lh = $data['lighthouseResult'];
            return [
                'score'   => round( $lh['categories']['performance']['score'] * 100 ),
                'status'  => 'healthy',
                'metrics' => [
                    'fcp' => $lh['audits']['first-contentful-paint']['displayValue'] ?? 'N/A',
                    'lcp' => $lh['audits']['largest-contentful-paint']['displayValue'] ?? 'N/A',
                    'tbt' => $lh['audits']['total-blocking-time']['displayValue'] ?? 'N/A',
                    'cls' => $lh['audits']['cumulative-layout-shift']['displayValue'] ?? 'N/A',
                    'si'  => $lh['audits']['speed-index']['displayValue'] ?? 'N/A',
                ]
            ];
        }

        // Better error message extraction
        $error_msg = 'Unknown API error';
        
        if ( isset( $data['lighthouseResult']['runtimeError']['message'] ) ) {
            $error_msg = $data['lighthouseResult']['runtimeError']['message'];
        } elseif ( isset( $data['error']['message'] ) ) {
            $error_msg = $data['error']['message'];
        } elseif ( isset( $data['lighthouseResult']['errorMessage'] ) ) {
            $error_msg = $data['lighthouseResult']['errorMessage'];
        }

        // Cleanup Lighthouse connectivity errors for better UX
        $connectivity_patterns = [
            'FAILED_DOCUMENT_REQUEST',
            'net::ERR_CONNECTION_FAILED',
            'Lighthouse was unable to reliably load the page',
            'ERRO_CONEXAO_RECUSADA'
        ];

        foreach ( $connectivity_patterns as $pattern ) {
            if ( stripos( $error_msg, $pattern ) !== false ) {
                $error_msg = 'Connectivity error: Google cannot reach your local site.';
                break;
            }
        }

        return [
            'score' => 0, 
            'error' => $error_msg
        ];
    }

    private function get_local_lighthouse_score( $url, $strategy ) {
        // Ensure we don't time out during a local audit
        if ( function_exists( 'set_time_limit' ) ) {
            @set_time_limit( 300 );
        }

        $strategy_flag = $strategy === 'mobile' ? '--form-factor=mobile --screenEmulation.mobile' : '--form-factor=desktop --screenEmulation.disabled';
        
        // Use npx to run lighthouse headlessly and get JSON output
        // We only request the performance category to save time
        $command = sprintf(
            'npx lighthouse %s --output=json --chrome-flags="--headless" --only-categories=performance %s --quiet 2>&1',
            escapeshellarg( $url ),
            $strategy_flag
        );

        $output = shell_exec( $command );

        if ( ! $output ) {
            return [
                'score' => 0,
                'error' => 'Local audit failed. Ensure Node.js and Lighthouse are installed.'
            ];
        }

        $data = json_decode( $output, true );

        if ( isset( $data['categories']['performance']['score'] ) ) {
            return [
                'score'   => round( $data['categories']['performance']['score'] * 100 ),
                'status'  => 'healthy',
                'metrics' => [
                    'fcp' => $data['audits']['first-contentful-paint']['displayValue'] ?? 'N/A',
                    'lcp' => $data['audits']['largest-contentful-paint']['displayValue'] ?? 'N/A',
                    'tbt' => $data['audits']['total-blocking-time']['displayValue'] ?? 'N/A',
                    'cls' => $data['audits']['cumulative-layout-shift']['displayValue'] ?? 'N/A',
                    'si'  => $data['audits']['speed-index']['displayValue'] ?? 'N/A',
                ]
            ];
        }

        return [
            'score' => 0,
            'error' => 'Lighthouse CLI error: ' . substr( strip_tags( $output ), 0, 200 )
        ];
    }

    public function get_latest_results() {
        return [
            'current' => get_option( 'wp_barq_pagespeed_results', [
                'timestamp' => null,
                'mobile'    => ['score' => 0],
                'desktop'   => ['score' => 0]
            ]),
            'history' => get_option( 'wp_barq_pagespeed_history', [] )
        ];
    }
}
