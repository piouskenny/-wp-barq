<?php
namespace WpBarq\Core;

class ServiceManager {
    private $services = [];

    public function register( $name, $instance ) {
        $this->services[$name] = $instance;
    }

    public function get( $name ) {
        return isset( $this->services[$name] ) ? $this->services[$name] : null;
    }

    public function init_services() {
        foreach ( $this->services as $service ) {
            if ( method_exists( $service, 'init' ) ) {
                $service->init();
            }
        }
    }
}
