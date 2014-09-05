<?php
	define('HASH_SALT', 'panopo.ly' );
	define('BUCKET_IMAGE', 'image.panopo.ly' );
	define('AWS_ACCESS','AKIAJK2WSC6CZI3Y7YUQ');
	define('AWS_SECRET','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');
	define('DEBUG_VAR', 'debug' );
	define('FFMPEG_BIN', './ffmpeg' );
	define('FFMPEG_JPEG_QUALITY', 2 );	//	1(best)...31(worst)
	
	function Init()
	{
		$Debug = array_key_exists( DEBUG_VAR, $_GET );
		$Debug = true;
		if ( $Debug )
		{
			define( 'DEBUG', true );
			//	show all errors
			ini_set('display_startup_errors',1);
			error_reporting(E_ALL);
			ini_set('display_errors', 1);
		}
		else
		{
			define('DEBUG', false );
		}

		set_error_handler("ErrorHandler");
		ob_start();
	}
	Init();

	function ErrorHandler($errno, $errstr, $errfile, $errline)
	{
		//	ignore @ errors
		if ( error_reporting() == 0 )
			return;
		$Error = "$errfile($errline): $errstr";
		OnError($Error);
	}
	
	function OnError($Error)
	{
		$object = array();
		$object['error'] = $Error;
		$object['debug'] = ob_get_contents();
		ob_clean();
		$json = json_encode( $object );
		echo $json;
		exit(1);
	}

	function SanitisePanoName($Filename)
	{
		if ( $Filename === false )
			return false;
		//	limit to certain characterset
		$Filename = preg_replace('/[^A-Za-z0-9_]/', '_', $Filename );
		$Filename = str_pad( $Filename, 3, "_" );
		return $Filename;
	}

	function GetHashFile($Filename)
	{
		return hash_file("crc32", $Filename);
	}

	function GetHash($Content)
	{
		//	replace this with a database increment and hash that number to a short hash?
		//	crc32 is short anyway
		return hash("crc32", $Content);
	}

	//	returns TRUE or error string
	function UploadFile($localfilename,$remotefilename,$ContentType)
	{
		if ( !file_exists($localfilename) )
		{
			echo "Missing localfile: $localfilename";
			return false;
		}
		try
		{
			//echo "putting $localfilename (" . filesize($localfilename) . ") into $remotefilename...";
			S3::putObject( S3::inputFile($localfilename, false), BUCKET_IMAGE, $remotefilename, S3::ACL_PUBLIC_READ, array(), array('Content-Type' => $ContentType ));
		}
		catch ( Exception $e )
		{
			return "Error uploading $remotefilename: " . $e->getMessage();
		}
		return true;
	}
	
	//	returns TRUE or error string
	function UploadContent($Content,$remotefilename,$ContentType)
	{
		try
		{
			S3::putObject( $Content, BUCKET_IMAGE, $remotefilename, S3::ACL_PUBLIC_READ, array(), array('Content-Type' => $ContentType ));
		}
		catch ( Exception $e )
		{
			return "Error uploading $remotefilename: " . $e->getMessage();
		}
		return true;
	}
	
	function GetPanoTempFilename($Panoname,$Suffix='temp')
	{
		return sys_get_temp_dir() . "/$Panoname.$Suffix.jpg";
	}
	
	function ExecPhp($Script,$Params,$LogFile,$Blocking)
	{
		//	todo: check $Script exists
		if ( $LogFile === false )
			$LogFile = "/dev/null";
		$StdErrtoStdOut = "2>&1";
		$Blocking = $Blocking ? "" : "&";
		$Command = "php $Script " . escapeshellarg($Params) . " >> $LogFile $StdErrtoStdOut $Blocking";
		$result = exec($Command);
		echo $result;
		return true;
	}

?>