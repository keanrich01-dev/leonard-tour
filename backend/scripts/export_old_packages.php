<?php
$src = file_get_contents('safari2.php');
preg_match('/^\];/m', $src, $m, PREG_OFFSET_CAPTURE);
$code = substr($src, 0, $m[0][1] + 2);
eval('?>' . $code . "\n");
echo json_encode($safaris, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
