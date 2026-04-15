<?php
namespace WpBarq\Services;

class FaultDetector {
    private $log_file;
    private $is_debug_mode_active = false;

    public function __construct() {
        $upload_dir = wp_upload_dir();
        // Secure log file location
        $log_dir = trailingslashit( $upload_dir['basedir'] ) . 'wp-barq-logs';
        if ( ! file_exists( $log_dir ) ) {
            wp_mkdir_p( $log_dir );
            // Deny public access to logs
            file_put_contents( trailingslashit( $log_dir ) . '.htaccess', 'deny from all' );
            file_put_contents( trailingslashit( $log_dir ) . 'index.php', '<?php // Silence is golden.' );
        }
        $this->log_file = trailingslashit( $log_dir ) . 'faults.log';
    }

    public function init() {
        $this->is_debug_mode_active = get_option( 'wp_barq_debug_mode', false );

        // If debug mode is active, ensure we check its expiration.
        if ( $this->is_debug_mode_active ) {
            $expiration = get_option( 'wp_barq_debug_mode_expiration', 0 );
            if ( time() > $expiration ) {
                $this->is_debug_mode_active = false;
                update_option( 'wp_barq_debug_mode', false );
            }
        }

        // Register handlers
        set_error_handler( [$this, 'handle_error'] );
        set_exception_handler( [$this, 'handle_exception'] );
        register_shutdown_function( [$this, 'handle_shutdown'] );
    }

    public function handle_error( $errno, $errstr, $errfile, $errline ) {
        // Skip notices if not in debug mode
        if ( ! $this->is_debug_mode_active && in_array( $errno, [E_NOTICE, E_USER_NOTICE, E_DEPRECATED, E_USER_DEPRECATED, E_STRICT] ) ) {
            return false;
        }

        $severity = $this->get_severity_string($errno);
        $this->log( $severity, $errstr, $errfile, $errline );

        // To ensure "silent capture" and avoid breaking frontend,
        // returning TRUE prevents the default PHP error handler from running.
        // However, for critical user errors, we might want to let them halt.
        if ( $severity !== 'CRITICAL' ) {
            return true; 
        }

        return false;
    }

    public function handle_exception( $exception ) {
        $this->log( 'CRITICAL', $exception->getMessage(), $exception->getFile(), $exception->getLine() );
    }

    public function handle_shutdown() {
        $error = error_get_last();
        if ( $error !== null && in_array( $error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR] ) ) {
            $this->log( 'CRITICAL', $error['message'], $error['file'], $error['line'] );
            // A fatal error occurred. Action will be triggered in the log method.
        }
    }

    private function log( $severity, $message, $file, $line ) {
        $timestamp = current_time( 'mysql', 1 );
        $log_entry = json_encode([
            'timestamp' => $timestamp,
            'severity'  => $severity,
            'message'   => $message,
            'file'      => $file,
            'line'      => $line
        ]) . PHP_EOL;
        
        file_put_contents( $this->log_file, $log_entry, FILE_APPEND );
        
        if ( $severity === 'CRITICAL' ) {
            do_action( 'wp_barq_critical_fault', [
                'message' => $message,
                'file'    => $file,
                'line'    => $line
            ] );
        }
    }

    private function get_severity_string( $errno ) {
        switch ( $errno ) {
            case E_ERROR: case E_USER_ERROR: case E_CORE_ERROR: case E_COMPILE_ERROR: case E_RECOVERABLE_ERROR:
                return 'CRITICAL';
            case E_WARNING: case E_USER_WARNING: case E_CORE_WARNING: case E_COMPILE_WARNING:
                return 'WARNING';
            default:
                return 'INFO';
        }
    }
}
