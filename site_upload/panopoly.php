<?php
	define('HASH_SALT', 'panopo.ly' );
	define('BUCKET_IMAGE', 'image.panopo.ly' );
	define('AWS_ACCESS','AKIAJK2WSC6CZI3Y7YUQ');
	define('AWS_SECRET','OP5gbapC3xlXo1kbO73cJ8T8GkZyZLKyzxjjelPT');
	define('DEBUG_VAR', 'debug' );
	define('FAKE_UPLOAD_VAR', 'fakeupload' );
	
	//	gr: need a better localhost solution
	if ( file_exists('./ffmpeg') )
	{
		define('FFMPEG_BIN', './ffmpeg' );
		define('FFPROBE_BIN', './ffprobe' );
	}
	else
	{
		define('FFMPEG_BIN', '../apps/ffmpeg' );
		define('FFPROBE_BIN', '../apps/ffprobe' );
	}

	define('FFMPEG_JPEG_QUALITY', 2 );	//	1(best)...31(worst)
	define('VIDEO_FORMATS', 'vp8 webm mp4 h264' );

	function IsCli()
	{
		//	todo: auto argc/v to _GET
		return (PHP_SAPI == "cli");
	}

	function dir_exists($Dir)
	{
		if ( !file_exists($Dir) )
			return false;
		if ( is_file($Dir) )
			return false;
		return true;
	}
	
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

		if ( !defined('FAKE_UPLOAD') )
		{
			$FakeUpload = array_key_exists( FAKE_UPLOAD_VAR, $_GET );
			define( 'FAKE_UPLOAD', $FakeUpload );
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
		$json = json_encode( $object, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES );
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

		if ( FAKE_UPLOAD !== false )
		{
			if ( dir_exists(FAKE_UPLOAD) )
			{
				if ( !copy( $localfilename, FAKE_UPLOAD . '/' . $remotefilename ) )
					return "Error copying to " . FAKE_UPLOAD . '/' . $remotefilename;
			}
			return true;
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
		if ( FAKE_UPLOAD !== false )
		{
			if ( dir_exists(FAKE_UPLOAD) )
			{
				if ( !file_put_contents( FAKE_UPLOAD . '/' . $remotefilename, $Content ) )
					return "Error copying to " . FAKE_UPLOAD . '/' . $remotefilename;
			}
			return true;
		}
		
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
	
	//	gr: use .upload as if we use jpg ffprobe won't detect contents properly
	function GetPanoTempFilename($Panoname,$Suffix='temp',$Extension='upload')
	{
		return sys_get_temp_dir() . "/$Panoname.$Suffix.$Extension";
	}

	//	returns exitcode
	function SoyExec(&$Command,&$Output,$CatchStdErr=true,$Blocking=true)
	{
		if ( $CatchStdErr )
			$Command .= ' 2>&1';

		if ( !$Blocking )
			$Command .= ' &';
		
		$ExitCode = -1;
		
		//	this fails when calling makecubemap.php directly with
		//		Output file #0 does not contain any stream
		//	NEED to use passthru
		if ( false )
		{
			exec( $Command, $Output, $ExitCode );
			$Output = join('', $Output );
		}
		else
		{
			//	use passthru and capture output
			ob_start();
			passthru( $Command, $ExitCode );
			$Output = ob_get_contents();
			ob_end_clean();
		}
		return $ExitCode;
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

	function GetFfmpegInputFormats()
	{
		$LoadFormats[] = false;		//	auto-detect type (seems to work for video)
		$LoadFormats[] = 'mjpeg';	//	works for jpeg
		$LoadFormats[] = 'image2';	//	this is png(?!)
		return $LoadFormats;
	}
	
	class TStreamInfo
	{
		public $mCodec;
		public $mStreamIndex;
		public $mWidth;
		public $mHeight;
		public $mInputFormat;
	};
	
	//	returns associate array of data
	function ProbeVideo($Filename)
	{
		if ( !file_exists($Filename) )
		{
			echo "ffprobe aborted [$Filename] doesn't exist";
			return false;
		}
		$ExitCode = -1;
		
		$Formats = GetFfmpegInputFormats();
		$Error = false;
		$InputFormat = false;
		
		foreach ( $Formats as $Format )
		{
			if ( $Format == false )
				$Param_TestFormat = '';
			else
				$Param_TestFormat = "-f $Format";

			$Param_Quiet = "-v quiet";
			$Param_FormatJson = "-show_streams -print_format json";
			$Param_CatchStdErr = "2>&1";
			$Param_Input = "$Filename";
			$ExecCmd = FFPROBE_BIN . " $Param_TestFormat $Param_Input $Param_Quiet $Param_FormatJson $Param_CatchStdErr";
			exec( $ExecCmd, $ExecOut, $ExitCode );
			$ExecOut = join("\n", $ExecOut );
		
			if ( $ExitCode != 0 )
			{
				$Error = "failed to execute ffprobe: [$ExitCode][$ExecCmd][$ExecOut]\n";
				if ( $ExitCode > 0 )
					$Error .= "Not recognised as media type";
				continue;
			}
			
			//	success
			$Error = false;
			$InputFormat = $Format;
			break;
		}
		
		//	didn't manage success
		if ( $Error )
		{
			echo $Error;
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
			$StreamInfo->mInputFormat = $InputFormat;
			return $StreamInfo;
		}
		
		//	missing stream we wanted
		echo "Failed to find video stream from file";
		return false;
	}
	
	function IsVideoFormat($Format)
	{
		$Pos = strpos( VIDEO_FORMATS, $Format);
		if ( $Pos === false )
			return false;
		return true;
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
			return IsVideoFormat( $this->GetContentType() );
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
		
		public function GetMimeType()
		{
			$Format = $this->GetContentTypeFileExtension();
			$ContentType = IsVideoFormat($Format) ? "video/$Format" : "image/$Format";
			return $ContentType;
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
		
		function GetFfmpegInputFormat()
		{
			return $this->mInfo->mInputFormat;
		}
	};
	


?>