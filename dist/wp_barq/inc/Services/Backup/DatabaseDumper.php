<?php
namespace WpBarq\Services\Backup;

class DatabaseDumper {
    public function dump( $path ) {
        global $wpdb;

        $tables = $wpdb->get_results( "SHOW TABLES", ARRAY_N );
        $sql = "-- WP BARQ Backup\n-- Date: " . current_time('mysql') . "\n\n";

        foreach ( $tables as $table ) {
            $table_name = $table[0];
            
            // Structure
            $create_table = $wpdb->get_row( "SHOW CREATE TABLE `$table_name`", ARRAY_A );
            $sql .= "DROP TABLE IF EXISTS `$table_name`;\n";
            $sql .= $create_table['Create Table'] . ";\n\n";

            // Data
            $rows = $wpdb->get_results( "SELECT * FROM `$table_name`", ARRAY_A );
            if ( $rows ) {
                foreach ( $rows as $row ) {
                    $sql .= "INSERT INTO `$table_name` VALUES (";
                    $values = array_map( function($v) use ($wpdb) {
                        if ( is_null($v) ) return 'NULL';
                        return "'" . esc_sql($v) . "'";
                    }, array_values($row) );
                    $sql .= implode( ",", $values );
                    $sql .= ");\n";
                }
                $sql .= "\n";
            }
        }

        return file_put_contents( $path, $sql );
    }

    public function import( $path ) {
        global $wpdb;

        if ( ! file_exists( $path ) ) {
            return false;
        }

        $sql = file_get_contents( $path );
        $queries = explode( ";\n", $sql );

        foreach ( $queries as $query ) {
            $query = trim( $query );
            if ( ! empty( $query ) ) {
                $wpdb->query( $query );
            }
        }

        return true;
    }
}
