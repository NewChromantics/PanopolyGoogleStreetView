<?php
	require('panopoly.php');
	require('s3.php');

	define('UPLOAD_NAME','image');
	
	//	release mode catches exceptions
	S3::setExceptions(true);
	S3::setAuth( AWS_ACCESS, AWS_SECRET );
	
	function OnError($Error)
	{
		echo "<h1>Error</h1>";
		echo "<p>$Error</p>";
	}

	//	returns TRUE or error string
	function UploadFile($localfilename,$remotefilename,$ContentType)
	{
		try
		{
			echo "<p>putting $localfilename (" . filesize($localfilename) . ") into $remotefilename</p>";
			S3::putObject( S3::inputFile($localfilename, false), BUCKET_IMAGE, $remotefilename, S3::ACL_PUBLIC_READ, array(), array('Content-Type' => $ContentType ));
		}
		catch ( Exception $e )
		{
			return "Error uploading $remotefilename: " . $e->getMessage();
		}
		return true;
	}
	
	function OnFile($File)
	{
		$desiredname = array_key_exists('customname',$_POST) ? $_POST['customname'] : false;
		$size = $File['size'];
		$tmpfilename = $File['tmp_name'];
		$error = $File['error'];
		$imagetype = exif_imagetype($tmpfilename);

		var_dump($size);
		var_dump($tmpfilename);
		var_dump($error);
		var_dump($imagetype);

		//	clean filename to stop naughty hacking. if not good enough force hash
		$Panoname = SanitiseImageName($desiredname);
		if ( $Panoname === false )
		{
			$Panoname = GetHashFile($tmpfilename);
		}
		if ( $Panoname === false )
		{
			OnError("error determining filename $desiredname");
			return false;
		}
		
		if ( $error != 0 )
		{
			OnError("upload error $error");
			return false;
		}
		
		$ContentType = "";
		
		//	add extension
		if ( $imagetype == IMAGETYPE_JPEG )
		{
			$Filename = "$Panoname.256.jpg";
			$ContentType = "image/jpeg";
		}
		else if ( $imagetype == IMAGETYPE_PNG )
		{
			//	gr: atm, client only reads ".jpg" so we're gonna fake it and hope it works...
			$Filename = "$Panoname.256.jpg";
			$ContentType = "image/png";
		}
		else
		{
			OnError("unsupported image type $imagetype");
			return false;
		}
		
		//	send response before upload
		//	todo: spawn process for s3 upload
		echo "<p>uploading [$Panoname] to s3...</p>";
		ob_flush();
		flush();
		
		//	upload file (todo; spawn resizing processes etc)
		$result = UploadFile( $tmpfilename, $Filename, $ContentType );
		if ( $result !== true )
		{
			OnError("upload erorr: " . $result );
			return false;
		}
		
		echo "<h1>Success</h1>";
		echo "<p>$Panoname</p>";
		return true;
	}

	//	check for upload
	if ( !array_key_exists(UPLOAD_NAME, $_FILES) )
	{
		echo "upload_max_file_size: [" + ini_get('upload_max_filesize') + "]";
		var_dump($_FILES);
		OnError("No file provided");
		return;
	}
	OnFile( $_FILES[UPLOAD_NAME] );
?>
<p>finished</p>