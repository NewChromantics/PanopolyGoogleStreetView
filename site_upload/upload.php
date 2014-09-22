<?php
	require('panopoly.php');
	require('s3.php');

	
	define('UPLOADFILE_VAR','image');
	define('CUSTOMNAME_VAR','customname');
	define('PANOFORMAT_VAR', 'format' );
	
	function OnFile($File)
	{
		//var_dump($File);
		
		$desiredname = array_key_exists(CUSTOMNAME_VAR,$_POST) ? $_POST[CUSTOMNAME_VAR] : false;
		$PanoFormat = array_key_exists(PANOFORMAT_VAR,$_POST) ? $_POST[PANOFORMAT_VAR] : false;
		$size = $File['size'];
		$tmpfilename = $File['tmp_name'];
		$error = $File['error'];
		$imagetype = "missing tmpfilename";
		if ( file_exists($tmpfilename) )
			$imagetype = exif_imagetype($tmpfilename);

		/*
		var_dump($desiredname);
		var_dump($PanoFormat);
		var_dump($size);
		var_dump($tmpfilename);
		var_dump($error);
		var_dump($imagetype);
*/
		
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
		
		//	test if is a video format
		$Image = new TVideo($SpawnTempFilename);
		if ( !$Image->IsValid() )
		{
			return OnError("failed to read image or video information from $SpawnTempFilename");
		}
		
		if ( $PanoFormat == false )
			$PanoFormat = 'spheremap';
		
		$Params = array( 'panoname' => $Panoname, 'panoformat' => $PanoFormat );
		$Params['REMOTE_ADDR'] = GetArg('REMOTE_ADDR',false);

		//	spawn
		$blocking = false;
		$Output = ExecPhp("spawn.php", $Params, "spawn.log", $blocking );
		
		return $Panoname;
	}

	//	check for upload
	if ( !array_key_exists(UPLOADFILE_VAR, $_FILES) )
	{
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
	echo json_encode( $output, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES );
?>