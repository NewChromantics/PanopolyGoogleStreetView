<?php
	require('panopoly.php');
	require('s3.php');

	date_default_timezone_set("Europe/London");
	
	//	limit to 1 hour processing
	set_time_limit( 60 * 60 );
	
	//	release mode catches exceptions
	S3::setExceptions(true);
	S3::setAuth( AWS_ACCESS, AWS_SECRET );

	if ( !isset($argv) )
		$argv = array();
	
	if ( array_key_exists('arg',$_GET) )
		$argv[1] = $_GET['arg'];
	
	if ( !array_key_exists(1,$argv) )
		return OnError("Missing argv[1]");

	if ( !file_exists(FFMPEG_BIN) )
		return OnError("Missing ffmpeg " . FFMPEG_BIN );
	
	//	get temp file
	$Panoname = $argv[1];
	$TempFilename = GetPanoTempFilename($Panoname);
	if ( !file_exists($TempFilename) )
		return OnError("Missing temp file $TempFilename");

	function DeleteTempFile($TempFilename)
	{
		@unlink($TempFilename);
	}
	
	//	delete temp file on exit if not executed via GET test
	if ( !array_key_exists('arg',$_GET) )
	{
		register_shutdown_function('DeleteTempFile',$TempFilename);
	}

	
	class TImage
	{
		public $mFilename;
		public $mInfo;
		
		public function __construct($Filename)
		{
			$this->mFilename = $Filename;
			$this->mInfo = getimagesize( $this->mFilename );
		}
		
		public function IsValid()
		{
			return $this->mInfo !== false;
		}
		
		public function GetWidth()
		{
			return $this->mInfo[0];
		}
		
		public function GetHeight()
		{
			return $this->mInfo[1];
		}
		
		public function GetContentType()
		{
			return image_type_to_mime_type( $this->mInfo[2] );
		}
		
	};
	$Image = new TImage($TempFilename);
	if ( !$Image->IsValid() )
		return OnError("failed to read image information from $TempFilename");
	
	//	upload meta
	UploadMeta();

	//	resize and upload different sizes (height will dictate filename)
	if ( UploadResize( 256, 256 ) )		echo "created 256\n";
	if ( UploadResize( 2048, 1024 ) )	echo "created 1024\n";
	if ( UploadResize( 4096, 2048 ) )	echo "created 2048\n";
	//	gr: jpeg has a limit of 4096x4096!
	if ( UploadResize( 4096, 4096 ) )	echo "created 4096\n";
	
	//	upload orig
	UploadOrig();
	
	
	function UploadMeta()
	{
		global $Panoname,$Image;
		
		$Meta = array();
		//$Meta['date'] = gmdate('U');
		$Meta['origwidth'] = $Image->GetWidth();
		$Meta['origheight'] = $Image->GetHeight();
		$Meta['origcontenttype'] = $Image->GetContentType();
		
		$MetaJson = json_encode($Meta);
		$RemoteFilename = "$Panoname.meta";
		$Error = UploadContent( $MetaJson, $RemoteFilename, "text/plain" );
		if ( $Error !== true )
			OnError($Error);
		return true;
	}
	
	function UploadResize($Width,$Height)
	{
		global $Panoname,$Image;
		$w = $Image->GetWidth();
		$h = $Image->GetHeight();

		//	gr: don't scale up
		if ( $w < $Width && $h < $Height )
			return false;

		//	if original width is less <= height then make a square image
		if ( $w <= $Height )
			$Width = $Height;
		
		//	gr: process parent should ensure these filenames won't clash beforehand so this script can assume these filenames are safe
		//	make filename
		$RemoteFilename = "$Panoname.$Height.jpg";
		$ResizedTempFilename = GetPanoTempFilename($Panoname,$Height);
		register_shutdown_function('DeleteTempFile',$ResizedTempFilename);
		
		//	resize with ffmpeg
		$ExitCode = -1;
		$Param_Quiet = "-loglevel error";
		$Param_Overwrite = "-y";
		$Param_Quality = "-qscale:v " . FFMPEG_JPEG_QUALITY;
		$Param_CatchStdErr = "2>&1";
		$Param_Scale = "-vf scale=$Width:$Height";
		$Param_Input = "-i {$Image->mFilename}";
		$Param_Output = "$ResizedTempFilename";
		$ExecCmd = FFMPEG_BIN . " $Param_Quiet $Param_Overwrite $Param_Quality $Param_Input $Param_Scale $Param_Output $Param_CatchStdErr";
		exec( $ExecCmd, $ExecOut, $ExitCode );
		$ExecOut = join('\n', $ExecOut );
		if ( $ExitCode != 0 )
		{
			echo "failed to resize $Width $Height: [$ExitCode] $ExecOut\n";
			DeleteTempFile( $ResizedTempFilename );
			return false;
		}
		
		//	upload
		$Error = UploadFile( $ResizedTempFilename, $RemoteFilename, "image/jpeg" );
		if ( $Error !== true )
			OnError($Error);
		DeleteTempFile( $ResizedTempFilename );
		return true;
	}
	
	function UploadOrig()
	{
		global $Panoname,$Image;
		$RemoteFilename = "$Panoname.orig.jpg";
		$Error = UploadFile( $Image->mFilename, $RemoteFilename, $Image->GetContentType() );
		if ( $Error !== true )
			OnError($Error);
		return true;
	}
	
	$output = array();
	$output['panoname'] = $Panoname;
	$output['debug'] = ob_get_contents();
	ob_clean();
	if ( strlen($output['debug'] ) > 0 )
	{
		echo json_encode( $output );
		echo '\n';
	}
?>