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

	//	get temp file
	$Panoname = $argv[1];
	$TempFilename = GetPanoTempFilename($Panoname);
	if ( !file_exists($TempFilename) )
		return OnError("Missing temp file $TempFilename");

	//	read temp file into binary string
	$ImageData = file_get_contents($TempFilename);
	if ( $ImageData === false )
		return OnError("Failed to read temp file $TempFilename");

	//	delete temp file
	//unlink( $TempFilename );

	class TImage
	{
		public $mData;
		public $mResource = false;
		public $mInfo;
		
		public function __construct($Data)
		{
			$this->mData = $Data;
			$this->mInfo = getimagesizefromstring( $this->mData );
			$this->mResource = imagecreatefromstring( $this->mData );
		}
		
		public function GetWidth()
		{
			return imagesx($this->mResource);
		}
		
		public function GetHeight()
		{
			return imagesy($this->mResource);
		}
		
		public function GetContentType()
		{
			return image_type_to_mime_type( $this->mInfo[2] );
		}
		
		public function GetResizedJpeg($Width,$Height)
		{
			$imageresized = imagecreatetruecolor( $Width, $Height );
			if ( !imagecopyresampled( $imageresized, $this->mResource, 0,0,0,0, $Width, $Height, $this->GetWidth(), $this->GetHeight() ) )
				return false;

			//	imagejpeg ouputs to browser, capture it
			ob_start();
			$result = imagejpeg( $imageresized );
			$imagejpeg = ob_get_clean();
			if ( !$result )
				return false;
			return $imagejpeg;
		}
	};
	$Image = new TImage($ImageData);
	
	//	upload meta
	UploadMeta();

	//	resize and upload different sizes (height will dictate filename)
	UploadResize( 256, 256 );
	UploadResize( 2048, 1024 );
	UploadResize( 4096, 2048 );
	UploadResize( 8192, 4096 );
	
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
		
		//	make resized jpeg
		$ResizedImage = $Image->GetResizedJpeg( $Width, $Height );
		if ( $ResizedImage === false )
		{
			echo "failed to resize $Width $Height";
			return false;
		}
		
		$RemoteFilename = "$Panoname.$Height.jpg";

		$Error = UploadContent( $ResizedImage, $RemoteFilename, "image/jpeg" );
		if ( $Error !== true )
			OnError($Error);
		return true;
	}
	
	function UploadOrig()
	{
		global $Panoname,$Image;
		$RemoteFilename = "$Panoname.orig.jpg";
		$Error = UploadContent( $Image->mData, $RemoteFilename, $Image->GetContentType() );
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
	}
?>