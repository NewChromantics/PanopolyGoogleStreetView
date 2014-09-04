<?php
	require('panopoly.php');
	require('s3.php');

	define('UPLOADFILE_VAR','image');
	define('CUSTONNAME_VAR','customname');
	
	function OnFile($File)
	{
		var_dump($File);
		
		$desiredname = array_key_exists('customname',$_POST) ? $_POST['customname'] : false;
		$size = $File['size'];
		$tmpfilename = $File['tmp_name'];
		$error = $File['error'];
		$imagetype = "missing tmpfilename";
		if ( file_exists($tmpfilename) )
			$imagetype = exif_imagetype($tmpfilename);

		var_dump($desiredname);
		var_dump($size);
		var_dump($tmpfilename);
		var_dump($error);
		var_dump($imagetype);

		//	clean filename to stop naughty hacking. if not good enough force hash
		$Panoname = SanitisePanoName($desiredname);
		if ( $Panoname === false )
		{
			$Panoname = SanitisePanoName( GetHashFile($tmpfilename) );
		}
		if ( $Panoname === false )
			return OnError("error determining pano name $desiredname");
		
		if ( $error != 0 )
			return OnError("upload error $error");
		
		$SpawnTempFilename = GetPanoTempFilename($Panoname);
		if ( !move_uploaded_file( $tmpfilename, $SpawnTempFilename ) )
			return OnError("Error with uploaded temp file ($tmpfilename,$SpawnTempFilename)");
		
		echo "move( $tmpfilename, $SpawnTempFilename )";

		//	spawn
		if ( !ExecPhpBackground("spawn.php", $Panoname, "spawn.log" ) )
			return OnError("Failed to spawn");
		
		return $Panoname;
	}

	//	check for upload
	if ( !array_key_exists(UPLOADFILE_VAR, $_FILES) )
	{
		//echo "upload_max_file_size: [" + ini_get('upload_max_filesize') + "]";
		var_dump($_FILES);
		OnError("No file provided");
		return;
	}
	
	$Panoname = OnFile( $_FILES[UPLOADFILE_VAR] );
	if ( !$Panoname )
		return OnError("Error uploading pano file");
	
	$output = array();
	$output['panoname'] = $Panoname;
	$output['debug'] = ob_get_contents();
	ob_clean();
	echo json_encode( $output );
?>