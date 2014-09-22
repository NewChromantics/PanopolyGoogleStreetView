<?php
	require('panopoly.php');
	
	$Params = ['echo'=>'hello world!'];
	
	$Output = ExecPhp('test_echo.php',$Params,false,false);
	
	echo $Output;
?>