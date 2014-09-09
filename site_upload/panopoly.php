<?php
	define('HASH_SALT', 'panopo.ly' );
	define('BUCKET_IMAGE', 'image.panopo.ly' );
	define('AWS_ACCESS','AKIAJK2WSC6CZI3Y7YUQ');
	define('AWS_SECRET','OP5gbapC3xlXo1kbO73cJ8T8GkZyZLKyzxjjelPT');
	define('DEBUG_VAR', 'debug' );
	define('FAKE_UPLOAD_VAR', 'fakeupload' );
	define('FFMPEG_BIN', './ffmpeg' );
	define('FFPROBE_BIN', './ffprobe' );
	define('FFMPEG_JPEG_QUALITY', 2 );	//	1(best)...31(worst)
	
	function Init()
	{
		$Debug = array_key_exists( DEBUG_VAR, $_GET );
		$Debug = true;
		define( 'DEBUG', $Debug );
		if ( DEBUG )
		{
			//	show all errors
			ini_set('display_startup_errors',1);
			error_reporting(E_ALL);
			ini_set('display_errors', 1);
		}

		$FakeUpload = array_key_exists( FAKE_UPLOAD_VAR, $_GET );
		define( 'FAKE_UPLOAD', $FakeUpload );
		
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
		if ( array_key_exists('notjson',$_GET) )
		{
			$debug = ob_get_contents();
			ob_clean();
			echo "<h1>$Error</h1>";
			echo $debug;
			exit(1);
		}
			
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
		if ( FAKE_UPLOAD )
			return true;
		
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
		//	gr: use .upload as if we use jpg ffprobe won't detect contents properly
		return sys_get_temp_dir() . "/$Panoname.$Suffix.upload";
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


	
	class TStreamInfo
	{
		public $mCodec;
		public $mStreamIndex;
		public $mWidth;
		public $mHeight;
	};

	//	returns associate array of data
	function ProbeVideo($Filename)
	{
		$ExitCode = -1;
		$Param_Quiet = "-v quiet";
		$Param_FormatJson = "-show_streams -print_format json";
		$Param_CatchStdErr = "2>&1";
		$Param_Input = "$Filename";
		$ExecCmd = FFPROBE_BIN . " $Param_Input $Param_Quiet $Param_FormatJson $Param_CatchStdErr";
		exec( $ExecCmd, $ExecOut, $ExitCode );
		$ExecOut = join("\n", $ExecOut );
		if ( $ExitCode != 0 )
		{
			echo "failed to execute ffprobe: [$ExitCode][$ExecCmd] $ExecOut\n";
			return false;
		}

		//	decode json output
		$Json = $ExecOut;
		//$Json = '{"hello":"world"}';
		
		// This will remove unwanted characters.
		// Check http://www.php.net/chr for details
		for ($i = 0; $i <= 31; ++$i) {
			$Json = str_replace(chr($i), "", $Json);
		}
		$Json = str_replace(chr(127), "", $Json);
		if (0 === strpos(bin2hex($Json), 'efbbbf')) {
			$Json = substr($Json, 3);
		}
		
		$Data = json_decode( $Json, true );
		
		if ( $Data == null )
		{
			$Error = json_last_error_msg();
			echo "failed to decode json from ffprobe: $Error\n\n$Json\n";
			/*
			$constants = get_defined_constants(true);
			$json_errors = array();
			foreach ($constants["json"] as $name => $value) {
				if (!strncmp($name, "JSON_ERROR_", 11)) {
					$json_errors[$value] = $name;
				}
			}
			
			// Show the errors for different depths.
			foreach (range(4, 3, -1) as $depth) {
				var_dump(json_decode($Json, true, $depth));
				echo 'Last error: ', $json_errors[json_last_error()], PHP_EOL, PHP_EOL;
			}
			 */
			return false;
		}
		
		//	find the first video stream
	//	var_dump($Data);
	//	exit(0);
		$Streams = $Data['streams'];
		foreach ( $Streams as $Stream )
		{
			//	is it video?
			$codec_type = $Stream['codec_type'];
			if ( $codec_type != 'video' )
				continue;
			
			//	this is what we want
			$StreamInfo = new TStreamInfo();
			$StreamInfo->mCodec = $Stream['codec_name'];
			$StreamInfo->mStreamIndex = $Stream['index'];
			$StreamInfo->mWidth = $Stream['width'];
			$StreamInfo->mHeight = $Stream['height'];
			return $StreamInfo;
		}
		
		//	missing stream we wanted
		echo "Failed to find video stream from file";
		return false;
	}
	
	class TVideo
	{
		public $mFilename;
		public $mInfo;		//	TStreamInfo
		
		public function __construct($Filename)
		{
			$this->mFilename = $Filename;
			$this->mInfo = ProbeVideo( $this->mFilename );
		}
		
		public function IsValid()
		{
			return $this->mInfo !== false;
		}
		
		public function IsVideo()
		{
			$Type = $this->GetContentType();
			if ( $Type == 'h264' || $Type == 'vp8' )
				return true;
			return false;
		}
		
		public function GetWidth()
		{
			return $this->mInfo->mWidth;
		}
		
		public function GetHeight()
		{
			return $this->mInfo->mHeight;
		}
		
		public function GetContentType()
		{
			//return image_type_to_mime_type( $this->mInfo[2] );
			return $this->mInfo->mCodec;
		}
		
		public function GetContentTypeFileExtension()
		{
			//	cases so far: mjpeg(jpeg, not video!), png, h264, vp8

			$Extension = strtolower( $this->GetContentType() );
			//	if we know the type, we might want to change the extension
			if ( $Extension == 'png' )		return 'png';
			if ( $Extension == 'mjpeg' )	return 'jpg';
			if ( $Extension == 'vp8' )		return 'webm';
			
			//	repalce non a-z chars with X
			$Extension = preg_replace('/[^A-Za-z0-9_]/', 'X', $Extension );
			return $Extension;
		}
		
	};
?>