<?php
	require('panopoly.php');
	require('s3.php');

	S3::setExceptions(true);
	S3::setAuth( AWS_ACCESS, AWS_SECRET );
    
	echo "<h2>List buckets</h2>";
	print_r(S3::listBuckets());
	
	$Content = $_GET['content'];
	
	if ( $Content !== NULL )
	{
		//	get hashid of file
		$Hash = GetHash($Content);

		$Filename = $Hash;
		if ( array_key_exists( 'filename', $_GET ) )
		{
			$Filename = $_GET['filename'];
			$Filename = SanitiseImageName($Filename);
		}
		echo "<h2>Put file $Filename</h2>";
		$ContentType ='text/plain';
		S3::putObject( $Content, BUCKET_IMAGE, $Filename, S3::ACL_PUBLIC_READ, array(), array('Content-Type' => $ContentType ));
	}

?>
<p>finished</p>