<?php
require_once('../../../wp-load.php');
$free = disk_free_space(ABSPATH);
$total = disk_total_space(ABSPATH);
echo "ABSPATH: " . ABSPATH . "\n";
echo "Free: " . ($free === false ? 'FALSE' : $free) . "\n";
echo "Total: " . ($total === false ? 'FALSE' : $total) . "\n";
?>
